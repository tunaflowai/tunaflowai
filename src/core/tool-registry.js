import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureDir, limitNumber, safeJoin, trimToChars } from './utils.js';

const execFileAsync = promisify(execFile);

export class ToolRegistry {
  constructor({ workspace, auditLog = null, config = {} }) {
    this.workspace = path.resolve(workspace || process.cwd());
    this.auditLog = auditLog;
    this.config = {
      commandAllowlist: config.commandAllowlist || ['node', 'npm', 'pnpm', 'yarn', 'git', 'python', 'python3'],
      commandDenyPatterns: config.commandDenyPatterns || ['git push', 'git reset --hard', 'npm publish', 'pnpm publish', 'yarn publish', 'rm -rf', 'curl | sh', 'wget | sh'],
      maxCommandOutputChars: config.maxCommandOutputChars || 6000,
      defaultCommandTimeoutMs: config.defaultCommandTimeoutMs || 30000
    };
    this.tools = new Map();
    this.registerDefaults();
  }

  register(tool) {
    if (!tool?.name) throw new Error('Tool requires a name');
    if (!['low', 'medium', 'high', 'critical'].includes(tool.risk)) throw new Error(`Tool ${tool.name} has invalid risk level`);
    this.tools.set(tool.name, tool);
  }

  get(name) {
    return this.tools.get(name);
  }

  list() {
    return [...this.tools.values()].map(({ execute, ...meta }) => meta);
  }

  async execute(action, ctx = {}) {
    const tool = this.get(action.tool);
    if (!tool) throw new Error(`Unknown tool: ${action.tool}`);
    validateAction(tool, action);
    if (this.auditLog) await this.auditLog.record('tool.start', { tool: tool.name, args: action.args || {}, risk: tool.risk });
    const startedAt = Date.now();
    try {
      const result = await tool.execute(action.args || {}, { ...ctx, workspace: this.workspace });
      if (this.auditLog) await this.auditLog.record('tool.success', { tool: tool.name, latencyMs: Date.now() - startedAt, result });
      return result;
    } catch (error) {
      if (this.auditLog) await this.auditLog.record('tool.failure', { tool: tool.name, latencyMs: Date.now() - startedAt, error: error.message });
      throw error;
    }
  }

  registerDefaults() {
    this.register({
      name: 'send_reply',
      description: 'Send a reply to the current user/channel. MVP implementation writes to stdout and an outbound log.',
      risk: 'low',
      schema: { required: ['message'], properties: { message: 'string' } },
      execute: async ({ message, channel, conversationId, recipientId }, ctx) => {
        if (ctx.outboundRouter) {
          const result = await ctx.outboundRouter.send({
            channel,
            conversationId,
            recipientId,
            text: message || '',
            event: ctx.event,
            metadata: { runId: ctx.runId, approvalId: ctx.approvalId }
          });
          return { ok: true, message, delivery: result };
        }
        const outboundDir = path.join(ctx.dataDir || path.join(ctx.workspace, '.tunaflow'), 'outbound');
        await ensureDir(outboundDir);
        const line = `[TunaFlow reply] ${message || ''}`;
        console.log(line);
        await fs.appendFile(path.join(outboundDir, 'replies.log'), `${line}\n`, 'utf8');
        return { ok: true, message };
      }
    });

    this.register({
      name: 'inspect_state',
      description: 'Return the current compact work state.',
      risk: 'low',
      schema: { required: [], properties: {} },
      execute: async (_args, ctx) => ({ ok: true, state: ctx.stateEngine?.getState?.() || null })
    });

    this.register({
      name: 'list_files',
      description: 'List files in the workspace with a shallow recursive scan.',
      risk: 'low',
      schema: { required: [], properties: { path: 'string?', maxEntries: 'number?' } },
      execute: async ({ path: rel = '.', maxEntries = 80 }, ctx) => {
        const start = safeJoin(ctx.workspace, rel);
        const files = [];
        await walk(start, ctx.workspace, files, limitNumber(maxEntries, 80, { min: 1, max: 500 }));
        return { ok: true, files };
      }
    });

    this.register({
      name: 'read_file',
      description: 'Read a text file inside the workspace.',
      risk: 'low',
      schema: { required: ['path'], properties: { path: 'string', maxChars: 'number?' } },
      execute: async ({ path: rel, maxChars = 12000 }, ctx) => {
        const file = safeJoin(ctx.workspace, rel);
        const text = await fs.readFile(file, 'utf8');
        return { ok: true, path: rel, text: trimToChars(text, limitNumber(maxChars, 12000, { min: 1, max: 120000 })) };
      }
    });

    this.register({
      name: 'write_file',
      description: 'Write a text file inside the workspace. Requires approval by default.',
      risk: 'medium',
      schema: { required: ['path', 'content'], properties: { path: 'string', content: 'string' } },
      execute: async ({ path: rel, content }, ctx) => {
        const file = safeJoin(ctx.workspace, rel);
        await ensureDir(path.dirname(file));
        await fs.writeFile(file, content || '', 'utf8');
        return { ok: true, path: rel, bytes: Buffer.byteLength(content || '') };
      }
    });

    this.register({
      name: 'append_file',
      description: 'Append text to a file inside the workspace. Requires approval by default.',
      risk: 'medium',
      schema: { required: ['path', 'content'], properties: { path: 'string', content: 'string' } },
      execute: async ({ path: rel, content }, ctx) => {
        const file = safeJoin(ctx.workspace, rel);
        await ensureDir(path.dirname(file));
        await fs.appendFile(file, content || '', 'utf8');
        return { ok: true, path: rel, bytes: Buffer.byteLength(content || '') };
      }
    });

    this.register({
      name: 'edit_file',
      description: 'Replace text in a workspace file. Requires approval by default.',
      risk: 'medium',
      schema: { required: ['path', 'search', 'replace'], properties: { path: 'string', search: 'string', replace: 'string', all: 'boolean?' } },
      execute: async ({ path: rel, search, replace, all = false }, ctx) => {
        const file = safeJoin(ctx.workspace, rel);
        const text = await fs.readFile(file, 'utf8');
        if (!search) throw new Error('edit_file requires a non-empty search string');
        const updated = all ? text.split(search).join(replace || '') : text.replace(search, replace || '');
        if (updated === text) throw new Error('No matching text found for edit_file');
        await fs.writeFile(file, updated, 'utf8');
        return { ok: true, path: rel, changed: true };
      }
    });

    this.register({
      name: 'run_command',
      description: 'Run an allowlisted command in the workspace. High risk and approval-gated by default.',
      risk: 'high',
      schema: { required: ['command'], properties: { command: 'string', args: 'string[]?', timeoutMs: 'number?' } },
      execute: async ({ command, args = [], timeoutMs }, ctx) => {
        if (!this.config.commandAllowlist.includes(command)) throw new Error(`Command not allowlisted: ${command}`);
        if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) throw new Error('run_command args must be an array of strings');
        const commandLine = [command, ...args].join(' ');
        for (const pattern of this.config.commandDenyPatterns) {
          if (commandLine.toLowerCase().includes(String(pattern).toLowerCase())) throw new Error(`Command denied by policy: ${pattern}`);
        }
        const effectiveTimeoutMs = limitNumber(timeoutMs, this.config.defaultCommandTimeoutMs, { min: 1000, max: 120000 });
        const { stdout, stderr } = await execFileAsync(command, args, {
          cwd: ctx.workspace,
          timeout: effectiveTimeoutMs,
          maxBuffer: 1024 * 1024,
          env: sanitizedEnv(process.env)
        });
        return {
          ok: true,
          command,
          args,
          stdout: trimToChars(stdout, this.config.maxCommandOutputChars),
          stderr: trimToChars(stderr, this.config.maxCommandOutputChars)
        };
      }
    });
  }
}

function validateAction(tool, action) {
  if (!action || typeof action !== 'object') throw new Error('Action must be an object');
  if (action.tool !== tool.name) throw new Error(`Action tool mismatch: expected ${tool.name}`);
  const args = action.args || {};
  for (const required of tool.schema?.required || []) {
    if (args[required] === undefined || args[required] === null) throw new Error(`Tool ${tool.name} requires argument: ${required}`);
  }
}

function sanitizedEnv(env) {
  const allowedPrefixes = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'ComSpec'];
  const output = {};
  for (const key of allowedPrefixes) {
    if (env[key]) output[key] = env[key];
  }
  return output;
}

async function walk(dir, root, files, maxEntries, depth = 0) {
  if (files.length >= maxEntries || depth > 4) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (files.length >= maxEntries) break;
    if (['node_modules', '.git', '.tunaflow', '.tunaflow-demo', 'dist', 'coverage'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full) || '.';
    if (entry.isDirectory()) await walk(full, root, files, maxEntries, depth + 1);
    else files.push(rel);
  }
}

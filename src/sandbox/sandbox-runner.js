import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { limitNumber, trimToChars } from '../core/utils.js';

const execFileAsync = promisify(execFile);

export class SandboxRunner {
  constructor({ workspace = process.cwd(), config = {}, auditLog = null } = {}) {
    this.workspace = path.resolve(workspace);
    this.config = {
      mode: config.mode || 'local',
      dockerImage: config.dockerImage || 'node:22-bookworm-slim',
      commandAllowlist: config.commandAllowlist || ['node', 'npm', 'pnpm', 'yarn', 'git', 'python', 'python3'],
      commandDenyPatterns: config.commandDenyPatterns || ['git push', 'git reset --hard', 'npm publish', 'pnpm publish', 'yarn publish', 'rm -rf', 'curl | sh', 'wget | sh', 'chmod 777', 'sudo '],
      defaultTimeoutMs: config.defaultTimeoutMs || 30000,
      maxTimeoutMs: config.maxTimeoutMs || 120000,
      maxOutputChars: config.maxOutputChars || 6000,
      network: config.network || 'none',
      readOnly: config.readOnly === true,
      envAllowlist: config.envAllowlist || ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'ComSpec']
    };
    this.auditLog = auditLog;
  }

  listPolicy() {
    return { ...this.config, commandDenyPatterns: [...this.config.commandDenyPatterns] };
  }

  async run({ command, args = [], timeoutMs } = {}) {
    this.validate({ command, args });
    if (this.config.mode === 'docker') return this.runDocker({ command, args, timeoutMs });
    if (this.config.mode === 'dry-run') return { ok: true, dryRun: true, command, args, stdout: '', stderr: '' };
    return this.runLocal({ command, args, timeoutMs });
  }

  validate({ command, args = [] }) {
    if (!this.config.commandAllowlist.includes(command)) throw new Error(`Command not allowlisted: ${command}`);
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) throw new Error('Command args must be an array of strings');
    const commandLine = [command, ...args].join(' ').toLowerCase();
    for (const pattern of this.config.commandDenyPatterns) {
      if (commandLine.includes(String(pattern).toLowerCase())) throw new Error(`Command denied by sandbox policy: ${pattern}`);
    }
  }

  async runLocal({ command, args = [], timeoutMs }) {
    const effectiveTimeoutMs = limitNumber(timeoutMs, this.config.defaultTimeoutMs, { min: 1000, max: this.config.maxTimeoutMs });
    const startedAt = Date.now();
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: this.workspace,
      timeout: effectiveTimeoutMs,
      maxBuffer: 1024 * 1024,
      env: sanitizedEnv(process.env, this.config.envAllowlist)
    });
    return {
      ok: true,
      sandbox: 'local',
      command,
      args,
      latencyMs: Date.now() - startedAt,
      stdout: trimToChars(stdout, this.config.maxOutputChars),
      stderr: trimToChars(stderr, this.config.maxOutputChars)
    };
  }

  async runDocker({ command, args = [], timeoutMs }) {
    const effectiveTimeoutMs = limitNumber(timeoutMs, this.config.defaultTimeoutMs, { min: 1000, max: this.config.maxTimeoutMs });
    const dockerArgs = [
      'run', '--rm',
      '--network', this.config.network,
      '--workdir', '/workspace',
      '--mount', `type=bind,src=${this.workspace},dst=/workspace${this.config.readOnly ? ',readonly' : ''}`,
      this.config.dockerImage,
      command,
      ...args
    ];
    const startedAt = Date.now();
    const { stdout, stderr } = await execFileAsync('docker', dockerArgs, {
      cwd: this.workspace,
      timeout: effectiveTimeoutMs,
      maxBuffer: 1024 * 1024,
      env: sanitizedEnv(process.env, ['PATH', 'HOME'])
    });
    return {
      ok: true,
      sandbox: 'docker',
      command,
      args,
      latencyMs: Date.now() - startedAt,
      stdout: trimToChars(stdout, this.config.maxOutputChars),
      stderr: trimToChars(stderr, this.config.maxOutputChars)
    };
  }
}

function sanitizedEnv(env, allowlist) {
  const output = {};
  for (const key of allowlist) {
    if (env[key]) output[key] = env[key];
  }
  return output;
}

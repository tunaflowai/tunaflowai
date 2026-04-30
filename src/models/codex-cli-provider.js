import { execFile } from 'node:child_process';
import { approximateTokens } from '../core/utils.js';

export class CodexCliProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async complete({ messages = [], maxOutputTokens = 1200, temperature = 0.2, signal, json = false } = {}) {
    const prompt = buildPrompt(messages, { json, maxOutputTokens, temperature });
    const command = this.config.command || process.env[this.config.commandEnv || 'CODEX_BIN'] || 'codex';
    const args = buildArgs(this.config, prompt);
    const env = { ...process.env, ...(this.config.env || {}) };

    // Keep the normal OpenAI API provider available in TunaFlowAI, but prevent the
    // Codex subprocess from accidentally using OPENAI_API_KEY instead of ChatGPT OAuth.
    if (this.config.passOpenAiApiKey !== true && this.config.useOpenAiApiKey !== true) {
      delete env.OPENAI_API_KEY;
    }

    const result = await execFileBuffered(command, args, {
      cwd: this.config.cwd || process.env.TUNAFLOW_WORKSPACE || process.cwd(),
      env,
      signal,
      timeoutMs: this.config.timeoutMs || 120000,
      maxBuffer: this.config.maxBuffer || 1024 * 1024 * 4
    });

    const content = (result.stdout || '').trim();
    if (!content) {
      const stderr = (result.stderr || '').trim();
      throw new Error(stderr || 'Codex CLI returned no final stdout content');
    }

    return {
      content,
      usage: {
        inputTokens: approximateTokens(prompt),
        outputTokens: approximateTokens(content),
        totalTokens: approximateTokens(prompt) + approximateTokens(content)
      },
      raw: {
        provider: 'codex-cli',
        command,
        args: redactArgs(args),
        stderr: trim(result.stderr, 4000)
      }
    };
  }
}

function buildArgs(config, prompt) {
  const args = Array.isArray(config.args) ? [...config.args] : ['exec', '--ephemeral', '--sandbox', 'read-only'];
  if (!args.includes('exec') && !args.includes('e')) args.unshift('exec');

  const model = config.model || process.env.CODEX_MODEL;
  if (model && !/^YOUR_/i.test(model) && !args.includes('--model') && !args.includes('-m')) {
    args.push('--model', model);
  }

  const cd = config.cd || config.workspace || process.env.TUNAFLOW_WORKSPACE;
  if (cd && !args.includes('--cd') && !args.includes('-C')) {
    args.push('--cd', cd);
  }

  if (config.search === true && !args.includes('--search')) args.push('--search');
  if (config.fullAuto === true && !args.includes('--full-auto')) args.push('--full-auto');

  args.push(prompt);
  return args.map(String);
}

function buildPrompt(messages, { json, maxOutputTokens, temperature }) {
  const transcript = (messages || []).map((message) => {
    const role = message.role || 'user';
    const content = typeof message.content === 'string' ? message.content : contentFromParts(message.content);
    return role.toUpperCase() + ':\n' + content;
  }).join('\n\n---\n\n');

  const responseMode = json
    ? 'Return only valid JSON if the task asks for structured output.'
    : 'Return the final answer directly. Keep it concise unless the task needs details.';

  return [
    'You are being called by TunaFlowAI through the local Codex CLI provider.',
    'Use the already authenticated Codex session from ChatGPT OAuth. Do not ask for API keys.',
    'Max output target: ' + maxOutputTokens + ' tokens. Temperature hint: ' + temperature + '.',
    responseMode,
    '',
    transcript
  ].join('\n');
}

function contentFromParts(parts) {
  if (!Array.isArray(parts)) return String(parts || '');
  return parts.map((part) => {
    if (typeof part === 'string') return part;
    return part.text || part.content || JSON.stringify(part);
  }).filter(Boolean).join('\n');
}

function execFileBuffered(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, {
      cwd: options.cwd,
      env: options.env,
      maxBuffer: options.maxBuffer,
      windowsHide: true
    }, (error, stdout, stderr) => {
      cleanup();
      if (error) {
        const missing = error.code === 'ENOENT';
        const detail = missing
          ? 'Codex CLI was not found. Install it with: npm i -g @openai/codex, then run: codex login'
          : (stderr || error.message || 'Codex CLI failed');
        const wrapped = new Error(trim(detail, 1800));
        wrapped.cause = error;
        wrapped.stdout = stdout;
        wrapped.stderr = stderr;
        reject(wrapped);
        return;
      }
      resolve({ stdout, stderr });
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Codex CLI timed out after ' + options.timeoutMs + 'ms'));
    }, options.timeoutMs);

    const abort = () => {
      child.kill('SIGTERM');
      reject(new Error('Codex CLI call was aborted'));
    };

    if (options.signal) {
      if (options.signal.aborted) return abort();
      options.signal.addEventListener('abort', abort, { once: true });
    }

    function cleanup() {
      clearTimeout(timer);
      if (options.signal) options.signal.removeEventListener('abort', abort);
    }
  });
}

function redactArgs(args) {
  return args.map((arg, index) => {
    if (index === args.length - 1) return '[prompt redacted]';
    return arg;
  });
}

function trim(value, max) {
  const text = String(value || '');
  return text.length > max ? text.slice(0, max) + '...' : text;
}

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export function now() {
  return new Date().toISOString();
}

export function createId(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readJson(file, fallback = null) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJsonAtomic(file, data) {
  await ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, file);
}

export async function appendJsonl(file, data) {
  await ensureDir(path.dirname(file));
  await fs.appendFile(file, `${JSON.stringify(data)}\n`, 'utf8');
}

export async function readJsonl(file, limit = 100) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    return lines.slice(Math.max(0, lines.length - limit)).map((line) => JSON.parse(line));
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

export function approximateTokens(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return Math.ceil((text || '').length / 4);
}

export function trimToChars(text, maxChars) {
  if (!text || text.length <= maxChars) return text || '';
  const head = text.slice(0, Math.floor(maxChars * 0.65));
  const tail = text.slice(text.length - Math.floor(maxChars * 0.25));
  return `${head}\n\n[...trimmed ${text.length - head.length - tail.length} chars...]\n\n${tail}`;
}

export function safeJoin(root, targetPath) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(resolvedRoot, targetPath || '.');
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes workspace: ${targetPath}`);
  }
  return resolvedTarget;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout(promiseFactory, ms, label = 'operation') {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      promiseFactory(controller.signal),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function extractJsonObject(text) {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) {
      throw new Error('No JSON object found in model output');
    }
    return JSON.parse(trimmed.slice(first, last + 1));
  }
}

export function normalizeBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function redactSecrets(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text
    .replace(/(api[_-]?key|token|secret|password)(\"?\s*[:=]\s*\"?)[^\"\s,}]+/gi, '$1$2[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]');
}

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, now, pathExists, readJson, writeJsonAtomic } from '../core/utils.js';

export class SecretVault {
  constructor({ dataDir, config = {}, auditLog = null } = {}) {
    this.dataDir = path.resolve(dataDir || '.tunaflow');
    this.config = {
      enabled: config.enabled !== false,
      keyEnv: config.keyEnv || 'TUNAFLOW_SECRETS_KEY',
      allowLocalKeyFile: config.allowLocalKeyFile === true,
      keyFile: config.keyFile || path.join(this.dataDir, 'vault.key'),
      file: config.file || path.join(this.dataDir, 'secrets.enc.json')
    };
    this.auditLog = auditLog;
  }

  async init() {
    await ensureDir(this.dataDir);
    if (!(await pathExists(this.config.file))) {
      await this.writeStore({ version: 1, secrets: {}, createdAt: now(), updatedAt: now() });
    }
  }

  status() {
    return {
      enabled: this.config.enabled,
      keyConfigured: Boolean(process.env[this.config.keyEnv]),
      allowLocalKeyFile: this.config.allowLocalKeyFile,
      file: this.config.file
    };
  }

  async list() {
    const store = await this.readStore();
    return Object.keys(store.secrets || {}).sort().map((name) => ({ name, updatedAt: store.secrets[name]?.updatedAt || null }));
  }

  async get(name) {
    const store = await this.readStore();
    const entry = store.secrets?.[name];
    if (!entry) return null;
    return decrypt(entry, await this.key());
  }

  async set(name, value, metadata = {}) {
    validateName(name);
    const store = await this.readStore();
    store.secrets ||= {};
    store.secrets[name] = encrypt(String(value ?? ''), await this.key(), { updatedAt: now() });
    store.updatedAt = now();
    await this.writeStore(store);
    if (this.auditLog) await this.auditLog.record('secrets.set', { name, metadata });
    return { ok: true, name };
  }

  async delete(name, metadata = {}) {
    const store = await this.readStore();
    const existed = Boolean(store.secrets?.[name]);
    if (store.secrets) delete store.secrets[name];
    store.updatedAt = now();
    await this.writeStore(store);
    if (this.auditLog) await this.auditLog.record('secrets.deleted', { name, existed, metadata });
    return { ok: true, name, existed };
  }

  async key() {
    const envValue = process.env[this.config.keyEnv];
    if (envValue) return normalizeKey(envValue);
    if (!this.config.allowLocalKeyFile) throw new Error(`Secret vault key missing. Set ${this.config.keyEnv} or enable secrets.allowLocalKeyFile for local development.`);
    await ensureDir(path.dirname(this.config.keyFile));
    let raw = await fs.readFile(this.config.keyFile, 'utf8').catch(() => null);
    if (!raw) {
      raw = crypto.randomBytes(32).toString('base64url');
      await fs.writeFile(this.config.keyFile, raw, { encoding: 'utf8', mode: 0o600 });
    }
    return normalizeKey(raw.trim());
  }

  async readStore() {
    return await readJson(this.config.file, { version: 1, secrets: {}, createdAt: now(), updatedAt: now() });
  }

  async writeStore(store) {
    await writeJsonAtomic(this.config.file, store);
  }
}

function validateName(name) {
  if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(String(name || ''))) throw new Error('Secret name must be 1-120 chars of letters, numbers, _, ., :, or -');
}

function normalizeKey(value) {
  const raw = String(value || '');
  if (raw.length >= 32) return crypto.createHash('sha256').update(raw).digest();
  throw new Error('Secret vault key must be at least 32 characters');
}

function encrypt(plainText, key, extra = {}) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ...extra,
    alg: 'AES-256-GCM',
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
    ciphertext: ciphertext.toString('base64url')
  };
}

function decrypt(entry, key) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(entry.iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(entry.tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(entry.ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

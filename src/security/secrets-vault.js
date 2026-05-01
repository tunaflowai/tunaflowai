import crypto from 'node:crypto';
import path from 'node:path';
import { ensureDir, now, readJson, writeJsonAtomic } from '../core/utils.js';

export class SecretsVault {
  constructor({ dataDir, config = {}, auditLog = null } = {}) {
    this.dataDir = path.resolve(dataDir || '.tunaflow');
    this.file = path.join(this.dataDir, 'secrets.vault.json');
    this.auditLog = auditLog;
    this.config = config || {};
    this.keyEnv = this.config.keyEnv || 'TUNAFLOW_SECRETS_KEY';
    this.vault = { version: 1, secrets: {}, updatedAt: null };
  }
  async init() { await ensureDir(this.dataDir); this.vault = await readJson(this.file, null) || { version: 1, secrets: {}, updatedAt: now() }; this.vault.secrets ||= {}; await this.save(false); if (this.auditLog) await this.auditLog.record('secrets.loaded', { count: Object.keys(this.vault.secrets).length, keyEnv: this.keyEnv, encrypted: this.hasKey() }); }
  hasKey() { return Boolean(process.env[this.keyEnv] || this.config.key); }
  key() { const raw = process.env[this.keyEnv] || this.config.key; if (!raw) return null; return crypto.createHash('sha256').update(String(raw)).digest(); }
  async save(audit = true) { this.vault.updatedAt = now(); await writeJsonAtomic(this.file, this.vault); if (audit && this.auditLog) await this.auditLog.record('secrets.saved', { count: Object.keys(this.vault.secrets).length }); }
  list() { return Object.entries(this.vault.secrets || {}).map(([name, record]) => ({ name, encrypted: record.encrypted === true, createdAt: record.createdAt, updatedAt: record.updatedAt, description: record.description || null, source: record.source || 'vault' })).sort((a, b) => a.name.localeCompare(b.name)); }
  async set(name, value, metadata = {}) { const safeName = normalizeName(name); const current = this.vault.secrets[safeName] || {}; const record = this.encrypt(String(value ?? ''), { createdAt: current.createdAt || now(), updatedAt: now(), description: metadata.description || current.description || null, source: metadata.source || 'local-user' }); this.vault.secrets[safeName] = record; await this.save(); if (this.auditLog) await this.auditLog.record('secret.set', { name: safeName, encrypted: record.encrypted }); return { name: safeName, encrypted: record.encrypted, updatedAt: record.updatedAt }; }
  async delete(name) { const safeName = normalizeName(name); const existed = Boolean(this.vault.secrets[safeName]); delete this.vault.secrets[safeName]; await this.save(); if (this.auditLog) await this.auditLog.record('secret.deleted', { name: safeName, existed }); return { name: safeName, deleted: existed }; }
  async get(name, { expose = false } = {}) { const safeName = normalizeName(name); const record = this.vault.secrets[safeName]; if (!record) return null; const value = this.decrypt(record); return expose ? value : { name: safeName, encrypted: record.encrypted === true, updatedAt: record.updatedAt }; }
  resolve(nameOrEnv) { const direct = process.env[nameOrEnv]; if (direct) return direct; const record = this.vault.secrets[normalizeName(nameOrEnv, false)]; if (!record) return null; return this.decrypt(record); }
  encrypt(value, metadata) { const key = this.key(); if (!key) return { ...metadata, encrypted: false, value }; const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key, iv); const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); const tag = cipher.getAuthTag(); return { ...metadata, encrypted: true, algorithm: 'aes-256-gcm', iv: iv.toString('base64'), tag: tag.toString('base64'), ciphertext: ciphertext.toString('base64') }; }
  decrypt(record) { if (!record.encrypted) return record.value || ''; const key = this.key(); if (!key) throw new Error(`Secret is encrypted but ${this.keyEnv} is not set`); try { const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64')); decipher.setAuthTag(Buffer.from(record.tag, 'base64')); return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, 'base64')), decipher.final()]).toString('utf8'); } catch (error) { throw new Error(`Failed to decrypt secret: ${error.message}`); } }
}
function normalizeName(name, strict = true) { const value = String(name || '').trim(); if (!value && strict) throw new Error('Secret name is required'); const normalized = value.replace(/[^A-Za-z0-9_.:-]+/g, '_').slice(0, 160); if (!normalized && strict) throw new Error('Secret name is invalid'); return normalized; }

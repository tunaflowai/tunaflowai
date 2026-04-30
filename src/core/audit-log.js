import path from 'node:path';
import { appendJsonl, createId, ensureDir, now, readAllJsonl, readJsonl, redactSecrets, sha256 } from './utils.js';

const GENESIS_HASH = '0'.repeat(64);

export class AuditLog {
  constructor({ dataDir }) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'audit.jsonl');
    this.sequence = 0;
    this.lastHash = GENESIS_HASH;
  }

  async init() {
    await ensureDir(this.dataDir);
    const entries = await readAllJsonl(this.file);
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      this.sequence = Number(last.sequence || entries.length);
      this.lastHash = last.hash || GENESIS_HASH;
    }
  }

  async record(type, payload = {}) {
    const sanitizedPayload = JSON.parse(redactSecrets(payload));
    const entryBase = {
      id: createId('aud'),
      sequence: this.sequence + 1,
      type,
      timestamp: now(),
      previousHash: this.lastHash,
      payload: sanitizedPayload
    };
    const entry = {
      ...entryBase,
      hash: sha256(entryBase)
    };
    await appendJsonl(this.file, entry);
    this.sequence = entry.sequence;
    this.lastHash = entry.hash;
    return entry;
  }

  async recent(limit = 100) {
    return readJsonl(this.file, limit);
  }

  async verify() {
    const entries = await readAllJsonl(this.file);
    let previousHash = GENESIS_HASH;
    let expectedSequence = 1;

    for (const entry of entries) {
      if (!entry.hash || !entry.previousHash) {
        return { ok: false, reason: 'legacy-or-missing-hash', brokenAt: entry.id || null, entries: entries.length };
      }
      if (entry.sequence !== expectedSequence) {
        return { ok: false, reason: 'sequence-mismatch', brokenAt: entry.id, expectedSequence, actualSequence: entry.sequence, entries: entries.length };
      }
      if (entry.previousHash !== previousHash) {
        return { ok: false, reason: 'previous-hash-mismatch', brokenAt: entry.id, expected: previousHash, actual: entry.previousHash, entries: entries.length };
      }
      const { hash, ...entryBase } = entry;
      const expectedHash = sha256(entryBase);
      if (hash !== expectedHash) {
        return { ok: false, reason: 'hash-mismatch', brokenAt: entry.id, expected: expectedHash, actual: hash, entries: entries.length };
      }
      previousHash = hash;
      expectedSequence += 1;
    }

    return { ok: true, entries: entries.length, lastHash: previousHash };
  }
}

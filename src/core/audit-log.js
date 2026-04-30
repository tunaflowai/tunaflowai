import path from 'node:path';
import { appendJsonl, createId, ensureDir, now, readJsonl, redactSecrets } from './utils.js';

export class AuditLog {
  constructor({ dataDir }) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'audit.jsonl');
  }

  async init() {
    await ensureDir(this.dataDir);
  }

  async record(type, payload = {}) {
    const entry = {
      id: createId('aud'),
      type,
      timestamp: now(),
      payload: JSON.parse(redactSecrets(payload))
    };
    await appendJsonl(this.file, entry);
    return entry;
  }

  async recent(limit = 100) {
    return readJsonl(this.file, limit);
  }
}

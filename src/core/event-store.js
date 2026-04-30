import path from 'node:path';
import { appendJsonl, createId, ensureDir, now, readJsonl } from './utils.js';

export class EventStore {
  constructor({ dataDir }) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'events.jsonl');
  }

  async init() {
    await ensureDir(this.dataDir);
  }

  async append(event) {
    const normalized = {
      id: event.id || createId('evt'),
      timestamp: event.timestamp || now(),
      ...event
    };
    await appendJsonl(this.file, normalized);
    return normalized;
  }

  async recent(limit = 100) {
    return readJsonl(this.file, limit);
  }
}

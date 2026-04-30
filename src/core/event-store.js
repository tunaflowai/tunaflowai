import path from 'node:path';
import { appendJsonl, createId, ensureDir, now, readAllJsonl, readJsonl, validateEvent } from './utils.js';

export class EventStore {
  constructor({ dataDir }) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'events.jsonl');
  }

  async init() {
    await ensureDir(this.dataDir);
  }

  async append(event) {
    validateEvent(event);
    const normalized = {
      id: event.id || createId('evt'),
      timestamp: event.timestamp || now(),
      priority: event.priority || 'normal',
      ...event
    };
    await appendJsonl(this.file, normalized);
    return normalized;
  }

  async recent(limit = 100) {
    return readJsonl(this.file, limit);
  }

  async get(id) {
    const events = await readAllJsonl(this.file);
    return events.find((event) => event.id === id) || null;
  }
}

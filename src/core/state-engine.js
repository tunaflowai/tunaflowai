import path from 'node:path';
import { createId, ensureDir, now, readJson, writeJsonAtomic } from './utils.js';

const IMPORTANT_EVENT_TYPES = new Set([
  'user.message',
  'chat.message',
  'terminal.output',
  'file.changed',
  'browser.page_changed',
  'agent.result_failed',
  'approval.resolved'
]);

export class StateEngine {
  constructor({ dataDir }) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'state.json');
    this.state = null;
  }

  async init() {
    await ensureDir(this.dataDir);
    this.state = await readJson(this.file, null);
    if (!this.state) {
      this.state = freshState();
      await this.save();
    }
    this.state.version = 2;
    this.state.tasks ||= [];
    this.state.runs ||= [];
    this.state.recentEvents ||= [];
    this.state.recentErrors ||= [];
  }

  async save() {
    this.state.updatedAt = now();
    await writeJsonAtomic(this.file, this.state);
  }

  getState() {
    return structuredClone(this.state);
  }

  async updateFromEvent(event) {
    if (!this.state) await this.init();

    if (IMPORTANT_EVENT_TYPES.has(event.type)) {
      this.state.recentEvents.push(minifyEvent(event));
      this.state.recentEvents = this.state.recentEvents.slice(-75);
    }

    if (event.type === 'user.message' || event.type === 'chat.message') {
      const text = event.text || event.payload?.text || '';
      this.state.lastUserInstruction = text;
      this.state.activeTask = this.state.activeTask || this.createTaskObject({ title: text.slice(0, 120), sourceEventId: event.id });
      if (!this.state.tasks.some((task) => task.id === this.state.activeTask.id)) this.state.tasks.push(this.state.activeTask);
    }

    if (event.type === 'file.changed') {
      this.state.currentFile = event.path || event.payload?.path || this.state.currentFile;
    }

    if (event.type === 'browser.page_changed') {
      this.state.currentPage = {
        url: event.url || event.payload?.url || null,
        title: event.title || event.payload?.title || null,
        seenAt: now()
      };
    }

    if (event.type === 'terminal.output') {
      const text = event.text || event.payload?.text || '';
      if (/error|failed|exception|traceback|cannot|not found/i.test(text)) {
        this.state.recentErrors.push({
          text: text.slice(0, 1000),
          eventId: event.id,
          seenAt: now()
        });
        this.state.recentErrors = this.state.recentErrors.slice(-15);
      }
    }

    await this.save();
    return this.getState();
  }

  createTaskObject({ title, sourceEventId = null }) {
    return {
      id: createId('task'),
      title: title || 'Untitled task',
      status: 'active',
      sourceEventId,
      createdAt: now(),
      updatedAt: now()
    };
  }

  async createTask(input = {}) {
    if (!this.state) await this.init();
    const task = this.createTaskObject(input);
    this.state.tasks.push(task);
    this.state.activeTask = task;
    await this.save();
    return task;
  }

  async updateTask(taskId, patch = {}) {
    if (!this.state) await this.init();
    const task = this.state.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(`Unknown task: ${taskId}`);
    Object.assign(task, patch, { updatedAt: now() });
    if (this.state.activeTask?.id === taskId) this.state.activeTask = { ...task };
    await this.save();
    return task;
  }

  async recordRun(run) {
    if (!this.state) await this.init();
    this.state.runs.push({ ...run, recordedAt: now() });
    this.state.runs = this.state.runs.slice(-100);
    await this.save();
  }

  getRuns(limit = 50) {
    return (this.state?.runs || []).slice(-limit);
  }
}

function freshState() {
  return {
    version: 2,
    activeTask: null,
    lastUserInstruction: null,
    currentApp: null,
    currentFile: null,
    currentPage: null,
    recentErrors: [],
    recentEvents: [],
    tasks: [],
    runs: [],
    updatedAt: now()
  };
}

function minifyEvent(event) {
  return {
    id: event.id,
    type: event.type,
    priority: event.priority,
    timestamp: event.timestamp,
    text: event.text ? event.text.slice(0, 500) : undefined,
    path: event.path,
    url: event.url,
    title: event.title
  };
}

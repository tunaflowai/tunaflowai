import path from 'node:path';
import { createId, ensureDir, limitNumber, now, readJson, writeJsonAtomic } from '../core/utils.js';

const DEFAULT_BUDGET = {
  maxModelCalls: 8,
  maxInputTokens: 30000,
  maxOutputTokens: 6000,
  maxToolCalls: 20,
  maxRuntimeMs: 15 * 60 * 1000
};

export class TaskManager {
  constructor({ dataDir, config = {}, auditLog = null } = {}) {
    this.dataDir = path.resolve(dataDir || '.tunaflow');
    this.dir = path.join(this.dataDir, 'tasks');
    this.file = path.join(this.dir, 'tasks.json');
    this.config = { defaultBudget: { ...DEFAULT_BUDGET, ...(config.defaultBudget || {}) } };
    this.auditLog = auditLog;
    this.state = { activeTaskId: null, tasks: [] };
  }

  async init() {
    await ensureDir(this.dir);
    this.state = await readJson(this.file, { activeTaskId: null, tasks: [] });
    return this.state;
  }

  list({ status = null, limit = 100 } = {}) {
    let tasks = [...(this.state.tasks || [])];
    if (status) tasks = tasks.filter((task) => task.status === status);
    return tasks.slice(-limit);
  }

  get(id) {
    return (this.state.tasks || []).find((task) => task.id === id) || null;
  }

  active() {
    return this.get(this.state.activeTaskId) || null;
  }

  async create(input = {}, metadata = {}) {
    const task = {
      id: input.id || createId('task'),
      title: input.title || input.goal || 'Untitled task',
      goal: input.goal || input.title || '',
      status: input.status || 'active',
      source: input.source || 'manual',
      persona: input.persona || null,
      skills: input.skills || [],
      budget: normalizeBudget(input.budget || this.config.defaultBudget),
      usage: { modelCalls: 0, inputTokens: 0, outputTokens: 0, toolCalls: 0, runtimeMs: 0 },
      evidence: [],
      runs: [],
      createdAt: now(),
      updatedAt: now()
    };
    this.state.tasks.push(task);
    if (input.activate !== false) this.state.activeTaskId = task.id;
    await this.save();
    if (this.auditLog) await this.auditLog.record('task.created', { task, metadata });
    return task;
  }

  async activate(id, metadata = {}) {
    const task = this.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    this.state.activeTaskId = id;
    task.status = task.status === 'done' ? 'active' : task.status;
    task.updatedAt = now();
    await this.save();
    if (this.auditLog) await this.auditLog.record('task.activated', { id, metadata });
    return task;
  }

  async update(id, patch = {}, metadata = {}) {
    const task = this.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    Object.assign(task, patch, { updatedAt: now() });
    if (patch.budget) task.budget = normalizeBudget(patch.budget);
    await this.save();
    if (this.auditLog) await this.auditLog.record('task.updated', { id, patch, metadata });
    return task;
  }

  async ensureActiveFromEvent(event = {}, options = {}) {
    const active = this.active();
    if (active && active.status === 'active') return active;
    if (!options.autoCreate && event.type !== 'user.message' && event.type !== 'chat.message' && event.type !== 'channel.message') return null;
    return await this.create({
      title: firstSentence(event.text || event.type || 'Work task'),
      goal: event.text || event.type || 'Work task',
      source: 'event',
      activate: true
    }, { sourceEventId: event.id });
  }

  checkBudget(task = this.active()) {
    if (!task) return { ok: true, reason: 'No active task' };
    const budget = normalizeBudget(task.budget || this.config.defaultBudget);
    const usage = task.usage || {};
    const checks = [
      ['modelCalls', 'maxModelCalls'],
      ['inputTokens', 'maxInputTokens'],
      ['outputTokens', 'maxOutputTokens'],
      ['toolCalls', 'maxToolCalls'],
      ['runtimeMs', 'maxRuntimeMs']
    ];
    for (const [usedKey, budgetKey] of checks) {
      if (Number(usage[usedKey] || 0) >= Number(budget[budgetKey])) {
        return { ok: false, reason: `Task budget exceeded: ${usedKey}`, taskId: task.id, usage, budget };
      }
    }
    return { ok: true, taskId: task.id, usage, budget };
  }

  async recordRun(taskId, run = {}) {
    const task = this.get(taskId || this.state.activeTaskId);
    if (!task) return null;
    task.runs ||= [];
    task.runs.push(run.id || run.runId || createId('runref'));
    task.evidence ||= [];
    if (run.summary) task.evidence.push({ type: 'run.summary', text: run.summary, runId: run.id, at: now() });
    const usage = run.modelUsage || run.usage || run.modelResult?.usage || {};
    task.usage ||= { modelCalls: 0, inputTokens: 0, outputTokens: 0, toolCalls: 0, runtimeMs: 0 };
    task.usage.modelCalls += Number(run.modelCalls || run.attempts?.length || 0);
    task.usage.inputTokens += Number(usage.inputTokens || 0);
    task.usage.outputTokens += Number(usage.outputTokens || 0);
    task.usage.toolCalls += Number(run.toolCalls || run.actionResults?.length || 0);
    task.usage.runtimeMs += Number(run.runtimeMs || 0);
    task.updatedAt = now();
    await this.save();
    return task;
  }

  async ensure(id = 'global', budget = {}) {
    let task = this.get(id);
    if (!task) {
      task = await this.create({ id, title: id === 'global' ? 'Global task budget' : id, goal: id, source: 'budget-manager', budget: { ...this.config.defaultBudget, ...budget }, activate: false }, { source: 'budget-ensure' });
    } else if (budget && Object.keys(budget).length) {
      task.budget = normalizeBudget({ ...(task.budget || this.config.defaultBudget), ...budget });
      task.updatedAt = now();
      await this.save();
    }
    return task;
  }

  canSpend(idOrTask = this.active(), delta = {}) {
    const task = typeof idOrTask === 'string' ? this.get(idOrTask) : idOrTask;
    if (!task) return { allowed: true, ok: true, reason: 'No task budget found' };
    const budget = normalizeBudget(task.budget || this.config.defaultBudget);
    const usage = { ...(task.usage || {}) };
    const projected = {
      modelCalls: Number(usage.modelCalls || 0) + Number(delta.modelCalls || 0),
      inputTokens: Number(usage.inputTokens || 0) + Number(delta.inputTokens || 0),
      outputTokens: Number(usage.outputTokens || 0) + Number(delta.outputTokens || 0),
      toolCalls: Number(usage.toolCalls || 0) + Number(delta.toolCalls || 0),
      runtimeMs: Number(usage.runtimeMs || 0) + Number(delta.runtimeMs || 0)
    };
    const checks = [
      ['modelCalls', 'maxModelCalls'],
      ['inputTokens', 'maxInputTokens'],
      ['outputTokens', 'maxOutputTokens'],
      ['toolCalls', 'maxToolCalls'],
      ['runtimeMs', 'maxRuntimeMs']
    ];
    for (const [usedKey, budgetKey] of checks) {
      if (Number(projected[usedKey] || 0) > Number(budget[budgetKey])) {
        return { allowed: false, ok: false, reason: `Task budget would be exceeded: ${usedKey}`, taskId: task.id, usage, projected, budget };
      }
    }
    return { allowed: true, ok: true, taskId: task.id, usage, projected, budget };
  }

  async spend(idOrTask = this.active(), delta = {}) {
    const task = typeof idOrTask === 'string' ? this.get(idOrTask) : idOrTask;
    if (!task) return null;
    const check = this.canSpend(task, delta);
    if (!check.allowed) throw new Error(check.reason);
    task.usage ||= { modelCalls: 0, inputTokens: 0, outputTokens: 0, toolCalls: 0, runtimeMs: 0 };
    for (const key of ['modelCalls', 'inputTokens', 'outputTokens', 'toolCalls', 'runtimeMs']) {
      task.usage[key] = Number(task.usage[key] || 0) + Number(delta[key] || 0);
    }
    task.updatedAt = now();
    await this.save();
    return task;
  }

  async setBudget(id = 'global', budget = {}) {
    const task = await this.ensure(id, budget);
    task.budget = normalizeBudget({ ...(task.budget || this.config.defaultBudget), ...budget });
    task.updatedAt = now();
    await this.save();
    if (this.auditLog) await this.auditLog.record('task.budget_updated', { id: task.id, budget: task.budget });
    return task;
  }

  budgets() {
    return (this.state.tasks || []).map((task) => ({ taskId: task.id, title: task.title, status: task.status, budget: task.budget, usage: task.usage }));
  }

  async save() {
    await writeJsonAtomic(this.file, this.state);
  }
}

function normalizeBudget(value = {}) {
  return {
    maxModelCalls: limitNumber(value.maxModelCalls, DEFAULT_BUDGET.maxModelCalls, { min: 1, max: 500 }),
    maxInputTokens: limitNumber(value.maxInputTokens, DEFAULT_BUDGET.maxInputTokens, { min: 1000, max: 5000000 }),
    maxOutputTokens: limitNumber(value.maxOutputTokens, DEFAULT_BUDGET.maxOutputTokens, { min: 100, max: 1000000 }),
    maxToolCalls: limitNumber(value.maxToolCalls, DEFAULT_BUDGET.maxToolCalls, { min: 1, max: 1000 }),
    maxRuntimeMs: limitNumber(value.maxRuntimeMs, DEFAULT_BUDGET.maxRuntimeMs, { min: 1000, max: 86400000 })
  };
}

function firstSentence(text) {
  return String(text || '').split(/[.!?\n]/).map((part) => part.trim()).find(Boolean)?.slice(0, 120) || 'Work task';
}

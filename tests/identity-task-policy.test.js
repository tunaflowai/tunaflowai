import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createTunaFlowRuntime } from '../src/index.js';

test('Identity manager lets user name the agent and persists personality', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-identity-'));
  const app = await createTunaFlowRuntime({ runtime: { workspace, dataDir: path.join(workspace, '.tunaflow') }, models: [{ name: 'mock', provider: 'mock', behavior: 'ok', enabled: true }], chains: { default: ['mock'] } });
  await app.identityManager.setName('Anna');
  await app.identityManager.setPersonality({ tone: 'warm, analytical' });
  assert.equal(app.identityManager.get().agentName, 'Anna');
  assert.match(app.identityManager.promptBlock(), /warm, analytical/);
});

test('Task manager creates active task and enforces budget checks', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-task-'));
  const app = await createTunaFlowRuntime({ runtime: { workspace, dataDir: path.join(workspace, '.tunaflow') }, tasks: { defaultBudget: { maxModelCalls: 1 } }, models: [{ name: 'mock', provider: 'mock', behavior: 'ok', enabled: true }], chains: { default: ['mock'] } });
  const task = await app.taskManager.create({ title: 'Test budget', budget: { maxModelCalls: 1 } });
  assert.equal(app.taskManager.active().id, task.id);
  await app.taskManager.recordRun(task.id, { id: 'run1', attempts: [{ ok: true }] });
  assert.equal(app.taskManager.checkBudget(task).ok, false);
});

test('Policy engine denies dangerous shell command pattern', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-policy-'));
  const app = await createTunaFlowRuntime({ runtime: { workspace, dataDir: path.join(workspace, '.tunaflow') }, models: [{ name: 'mock', provider: 'mock', behavior: 'ok', enabled: true }], chains: { default: ['mock'] } });
  const tool = app.toolRegistry.get('run_command');
  const decision = await app.permissionEngine.evaluate({ tool, action: { tool: 'run_command', args: { command: 'git', args: ['push'] } }, event: { type: 'user.message' }, runId: 'run_test' });
  assert.equal(decision.allowed, false);
  assert.equal(decision.requiresApproval, false);
});

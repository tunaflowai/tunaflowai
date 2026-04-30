import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AuditLog } from '../src/core/audit-log.js';
import { ModelRouter } from '../src/core/model-router.js';
import { PermissionEngine } from '../src/core/permission-engine.js';
import { createTunaFlowRuntime } from '../src/index.js';
import { createModelProvider, listProviderIds } from '../src/models/provider-registry.js';

async function testAuditLog() {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-audit-'));
  const auditLog = new AuditLog({ dataDir });
  await auditLog.init();
  await auditLog.record('test.one', { value: 1 });
  await auditLog.record('test.two', { token: 'secret-token-value' });
  const verification = await auditLog.verify();
  assert.equal(verification.ok, true);
  assert.equal(verification.entries, 2);
}

async function testModelFallback() {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-test-'));
  const auditLog = new AuditLog({ dataDir });
  await auditLog.init();
  const router = new ModelRouter({
    fallback: { timeoutMs: 1000, cooldownMs: 1000, maxFailuresBeforeCooldown: 1 },
    models: [
      { name: 'primary', provider: 'mock', behavior: 'fail', enabled: true },
      { name: 'fallback', provider: 'mock', behavior: 'ok', enabled: true }
    ],
    chains: { default: ['primary', 'fallback'] }
  }, auditLog);
  const result = await router.complete({
    json: true,
    messages: [{ role: 'user', content: '{"currentEvent":{"type":"user.message","text":"hello"}}' }]
  });
  assert.equal(result.model.name, 'fallback');
  assert.equal(result.attempts[0].ok, false);
  assert.equal(result.attempts[1].ok, true);
}

async function testPermissionEngine() {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-perm-'));
  const engine = new PermissionEngine({ dataDir, config: {} });
  await engine.init();
  const low = await engine.evaluate({ tool: { name: 'send_reply', risk: 'low' }, action: { tool: 'send_reply' } });
  assert.equal(low.allowed, true);
  const medium = await engine.evaluate({ tool: { name: 'write_file', risk: 'medium' }, action: { tool: 'write_file', args: { path: 'x', content: 'y' } } });
  assert.equal(medium.allowed, false);
  assert.equal(medium.requiresApproval, true);
  assert.ok(medium.approvalId);
}

async function testApprovalFlow() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-workspace-'));
  const dataDir = path.join(workspace, '.tunaflow');
  const app = await createTunaFlowRuntime({
    runtime: { workspace, dataDir, proactive: true, verifyToolResults: true },
    tokenBudget: { maxInputTokens: 8000, maxOutputTokens: 1200, maxModelCallsPerEvent: 2 },
    fallback: { timeoutMs: 1000, cooldownMs: 1000, maxFailuresBeforeCooldown: 1 },
    models: [{
      name: 'planner', provider: 'mock', behavior: 'ok', enabled: true,
      response: {
        summary: 'Write a file after approval',
        plan: ['Request approval', 'Write file'],
        actions: [{ tool: 'write_file', args: { path: 'hello.txt', content: 'hello from approval' } }],
        confidence: 0.9,
        requiresApproval: true
      }
    }],
    chains: { default: ['planner'] },
    permissions: { autoApproveMedium: false, autoApproveHigh: false, blockedTools: [] }
  });
  const result = await app.runtime.handleEvent({ type: 'user.message', text: 'create hello.txt' });
  assert.equal(result.run.status, 'waiting_approval');
  const waiting = result.run.actionResults[0];
  assert.equal(waiting.status, 'waiting_approval');
  const approved = await app.runtime.resolveApproval(waiting.decision.approvalId, 'approved', { note: 'test approval' });
  assert.equal(approved.status, 'success');
  assert.equal(await readFile(path.join(workspace, 'hello.txt'), 'utf8'), 'hello from approval');
}


async function testProviderRegistry() {
  assert.ok(listProviderIds().includes('gemini'));
  assert.ok(listProviderIds().includes('anthropic'));
  assert.ok(listProviderIds().includes('deepseek'));
  const provider = createModelProvider({ name: 'local', provider: 'ollama', model: 'llama3.2', enabled: false });
  assert.equal(provider.constructor.name, 'OpenAICompatibleProvider');
}

async function testSkillsAndChannels() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-skills-'));
  const dataDir = path.join(workspace, '.tunaflow');
  const app = await createTunaFlowRuntime({
    runtime: { workspace, dataDir, proactive: true, verifyToolResults: true },
    models: [{ name: 'mock', provider: 'mock', behavior: 'ok', enabled: true }],
    chains: { default: ['mock'] },
    skills: { enabled: true, bundled: true, maxSkills: 3 },
    channels: { webhook: { enabled: true } }
  });
  const skills = app.skillLoader.list();
  assert.ok(skills.some((skill) => skill.name === 'terminal-debugger'));
  const selected = app.skillSelector.select({ event: { type: 'terminal.output', text: 'Error: cannot find module x' }, state: {} });
  assert.ok(selected.some((skill) => skill.name === 'terminal-debugger'));
  assert.ok(app.channelRegistry.list().some((channel) => channel.id === 'webhook'));
}

const tests = [
  ['audit hash chain', testAuditLog],
  ['model fallback', testModelFallback],
  ['permission gates', testPermissionEngine],
  ['approval execution', testApprovalFlow],
  ['provider registry', testProviderRegistry],
  ['skills and channels', testSkillsAndChannels]
];

for (const [name, fn] of tests) {
  await fn();
  console.log(`ok - ${name}`);
}

console.log(`\n${tests.length} smoke tests passed`);

// Keep the dependency-free MVP test runner deterministic across Node/npm environments.
setImmediate(() => process.exit(process.exitCode || 0));

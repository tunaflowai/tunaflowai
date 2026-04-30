import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createTunaFlowRuntime } from '../src/index.js';

test('Runtime gates medium-risk actions and executes them after approval', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-workspace-'));
  const dataDir = path.join(workspace, '.tunaflow');
  const app = await createTunaFlowRuntime({
    runtime: { workspace, dataDir, proactive: true, verifyToolResults: true },
    tokenBudget: { maxInputTokens: 8000, maxOutputTokens: 1200, maxModelCallsPerEvent: 2 },
    fallback: { timeoutMs: 1000, cooldownMs: 1000, maxFailuresBeforeCooldown: 1 },
    models: [{
      name: 'planner',
      provider: 'mock',
      behavior: 'ok',
      enabled: true,
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
  assert.ok(waiting.decision.approvalId);

  const approved = await app.runtime.resolveApproval(waiting.decision.approvalId, 'approved', { note: 'test approval' });
  assert.equal(approved.status, 'success');
  assert.equal(await readFile(path.join(workspace, 'hello.txt'), 'utf8'), 'hello from approval');
});

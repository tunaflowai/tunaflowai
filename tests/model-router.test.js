import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { AuditLog } from '../src/core/audit-log.js';
import { ModelRouter } from '../src/core/model-router.js';

test('ModelRouter falls back when primary model fails', async () => {
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
  assert.equal(Array.isArray(result.json.actions), true);
});

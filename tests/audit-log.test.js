import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { AuditLog } from '../src/core/audit-log.js';

test('AuditLog writes a verifiable hash chain', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-audit-'));
  const auditLog = new AuditLog({ dataDir });
  await auditLog.init();

  await auditLog.record('test.one', { value: 1 });
  await auditLog.record('test.two', { token: 'secret-token-value' });

  const verification = await auditLog.verify();
  assert.equal(verification.ok, true);
  assert.equal(verification.entries, 2);

  const recent = await auditLog.recent(2);
  assert.equal(recent[0].sequence, 1);
  assert.equal(recent[1].previousHash, recent[0].hash);
});

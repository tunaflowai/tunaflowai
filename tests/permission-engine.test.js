import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PermissionEngine } from '../src/core/permission-engine.js';

test('PermissionEngine allows low risk and gates medium risk by default', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-perm-'));
  const engine = new PermissionEngine({ dataDir, config: {} });
  await engine.init();

  const low = await engine.evaluate({ tool: { name: 'send_reply', risk: 'low' }, action: { tool: 'send_reply' } });
  assert.equal(low.allowed, true);

  const medium = await engine.evaluate({ tool: { name: 'write_file', risk: 'medium' }, action: { tool: 'write_file', args: { path: 'x', content: 'y' } } });
  assert.equal(medium.allowed, false);
  assert.equal(medium.requiresApproval, true);
  assert.ok(medium.approvalId);
});

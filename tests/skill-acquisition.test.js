import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createTunaFlowRuntime } from '../src/index.js';

test('acquires a local job skill from a SKILL.md folder', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-acquire-'));
  const skillDir = path.join(workspace, 'external-skills', 'receipt-auditor');
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, 'SKILL.md'), `---\nname: receipt-auditor\nversion: 0.1.0\ndescription: Audit receipt and POS related events.\ntriggers:\n  - receipt\n  - pos\ntools:\n  - read_file\nrisk: low\n---\n# Receipt Auditor\n\nReview POS receipt workflows and summarize findings.\n`, 'utf8');

  const app = await createTunaFlowRuntime({
    runtime: { workspace, dataDir: path.join(workspace, '.tunaflow'), proactive: true, verifyToolResults: true },
    skills: { enabled: true, bundled: false, acquired: true },
    personas: { enabled: true, bundled: true },
    models: [{ name: 'mock', provider: 'mock', behavior: 'ok', enabled: true }],
    chains: { default: ['mock'] }
  });

  const record = await app.skillLoader.acquire('external-skills/receipt-auditor');
  assert.equal(record.name, 'receipt-auditor');
  const skills = app.skillLoader.list();
  assert.ok(skills.some((skill) => skill.name === 'receipt-auditor' && skill.trust === 'acquired'));
  const acquired = await app.skillLoader.listAcquired();
  assert.ok(acquired.some((skill) => skill.name === 'receipt-auditor'));
});

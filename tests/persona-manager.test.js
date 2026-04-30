import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createTunaFlowRuntime } from '../src/index.js';

test('loads bundled personas and switches active persona', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-persona-'));
  const app = await createTunaFlowRuntime({
    runtime: { workspace, dataDir: path.join(workspace, '.tunaflow'), proactive: true, verifyToolResults: true },
    personas: { enabled: true, bundled: true, default: 'operator' },
    skills: { enabled: true, bundled: true },
    models: [{ name: 'mock', provider: 'mock', behavior: 'ok', enabled: true }],
    chains: { default: ['mock'], strong: ['mock'], cheap: ['mock'] }
  });

  const personas = app.personaManager.list();
  assert.ok(personas.some((persona) => persona.name === 'operator'));
  assert.ok(personas.some((persona) => persona.name === 'anna'));
  assert.equal(app.personaManager.getActive().name, 'operator');

  const active = await app.personaManager.activate('anna', { source: 'test' });
  assert.equal(active.name, 'anna');
  assert.equal(app.personaManager.getActive().name, 'anna');
});

test('active persona influences selected skills and run metadata', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-persona-run-'));
  const app = await createTunaFlowRuntime({
    runtime: { workspace, dataDir: path.join(workspace, '.tunaflow'), proactive: true, verifyToolResults: true },
    personas: { enabled: true, bundled: true, default: 'anna' },
    skills: { enabled: true, bundled: true, maxSkills: 3 },
    models: [{ name: 'mock', provider: 'mock', behavior: 'ok', enabled: true }],
    chains: { default: ['mock'], strong: ['mock'], cheap: ['mock'] }
  });

  const result = await app.runtime.handleEvent({ type: 'terminal.output', priority: 'high', text: 'Error: cannot find module x' });
  assert.equal(result.run.persona.name, 'anna');
  assert.ok(result.run.selectedSkills.some((skill) => skill.name === 'terminal-debugger'));
});

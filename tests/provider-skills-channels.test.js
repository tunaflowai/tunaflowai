import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createTunaFlowRuntime } from '../src/index.js';
import { createModelProvider, listProviderIds } from '../src/models/provider-registry.js';

test('Provider registry exposes native and OpenAI-compatible provider families', () => {
  const providers = listProviderIds();
  assert.ok(providers.includes('openai'));
  assert.ok(providers.includes('gemini'));
  assert.ok(providers.includes('anthropic'));
  assert.ok(providers.includes('qwen'));
  assert.ok(providers.includes('deepseek'));
  assert.ok(providers.includes('kimi'));
  assert.equal(createModelProvider({ name: 'local', provider: 'ollama', model: 'llama3.2' }).constructor.name, 'OpenAICompatibleProvider');
});

test('Runtime loads bundled skills and webhook channel adapter', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'tunaflow-runtime-'));
  const app = await createTunaFlowRuntime({
    runtime: { workspace, dataDir: path.join(workspace, '.tunaflow'), proactive: true, verifyToolResults: true },
    models: [{ name: 'mock', provider: 'mock', behavior: 'ok', enabled: true }],
    chains: { default: ['mock'] },
    skills: { enabled: true, bundled: true, maxSkills: 3 },
    channels: { webhook: { enabled: true } }
  });

  assert.ok(app.skillLoader.list().some((skill) => skill.name === 'terminal-debugger'));
  const selected = app.skillSelector.select({ event: { type: 'terminal.output', text: 'Error: cannot find module x' }, state: {} });
  assert.ok(selected.some((skill) => skill.name === 'terminal-debugger'));
  assert.ok(app.channelRegistry.list().some((channel) => channel.id === 'webhook'));
});

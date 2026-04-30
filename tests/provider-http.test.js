import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { OpenAICompatibleProvider } from '../src/models/openai-compatible-provider.js';
import { GeminiProvider } from '../src/models/providers/gemini-provider.js';
import { AnthropicProvider } from '../src/models/providers/anthropic-provider.js';

async function withServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('OpenAI-compatible provider handles local HTTP response', async () => {
  await withServer(async (req, res) => {
    assert.equal(req.url, '/chat/completions');
    const body = await readJson(req);
    assert.equal(body.model, 'test-model');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } }));
  }, async (baseUrl) => {
    const provider = new OpenAICompatibleProvider({ name: 'local-openai', baseUrl, apiKey: 'test', model: 'test-model' });
    const result = await provider.complete({ messages: [{ role: 'user', content: 'hello' }], json: true });
    assert.equal(result.content, '{"ok":true}');
    assert.equal(result.usage.totalTokens, 5);
  });
});

test('Gemini provider handles local HTTP response', async () => {
  await withServer(async (req, res) => {
    assert.match(req.url, /\/models\/gemini-test(%3A|:)generateContent\?key=test/);
    const body = await readJson(req);
    assert.ok(Array.isArray(body.contents));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"gemini":true}' }] } }], usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2, totalTokenCount: 6 } }));
  }, async (baseUrl) => {
    const provider = new GeminiProvider({ name: 'local-gemini', baseUrl, apiKey: 'test', model: 'gemini-test' });
    const result = await provider.complete({ messages: [{ role: 'user', content: 'hello' }], json: true });
    assert.equal(result.content, '{"gemini":true}');
    assert.equal(result.usage.totalTokens, 6);
  });
});

test('Anthropic provider handles local HTTP response', async () => {
  await withServer(async (req, res) => {
    assert.equal(req.url, '/messages');
    const body = await readJson(req);
    assert.equal(body.model, 'claude-test');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ content: [{ type: 'text', text: '{"anthropic":true}' }], usage: { input_tokens: 4, output_tokens: 3 } }));
  }, async (baseUrl) => {
    const provider = new AnthropicProvider({ name: 'local-anthropic', baseUrl, apiKey: 'test', model: 'claude-test' });
    const result = await provider.complete({ messages: [{ role: 'user', content: 'hello' }], json: true });
    assert.equal(result.content, '{"anthropic":true}');
    assert.equal(result.usage.totalTokens, 7);
  });
});

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

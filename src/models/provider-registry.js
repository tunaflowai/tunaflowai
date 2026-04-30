import { MockProvider } from './mock-provider.js';
import { OpenAICompatibleProvider } from './openai-compatible-provider.js';
import { CodexCliProvider } from './codex-cli-provider.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { GeminiProvider } from './providers/gemini-provider.js';
import { getProviderPreset, getModelCapability } from './model-catalog.js';

const PROVIDERS = new Map();

registerProvider('mock', (config) => new MockProvider(config));
registerProvider('codex-cli', (config) => new CodexCliProvider(config));
registerProvider('openai-codex', (config) => new CodexCliProvider(config));
registerProvider('codex', (config) => new CodexCliProvider(config));
registerProvider('openai-compatible', (config) => new OpenAICompatibleProvider(config));
registerProvider('openai', (config) => new OpenAICompatibleProvider({ baseUrl: 'https://api.openai.com/v1', apiKeyEnv: 'OPENAI_API_KEY', ...config, provider: 'openai' }));
registerProvider('openai-chat', (config) => new OpenAICompatibleProvider({ baseUrl: 'https://api.openai.com/v1', apiKeyEnv: 'OPENAI_API_KEY', ...config, provider: 'openai-chat' }));
registerProvider('anthropic', (config) => new AnthropicProvider(config));
registerProvider('claude', (config) => new AnthropicProvider(config));
registerProvider('gemini', (config) => new GeminiProvider(config));

// These providers expose OpenAI-compatible chat completion endpoints.
for (const provider of ['qwen', 'dashscope', 'minimax', 'deepseek', 'kimi', 'moonshot', 'openrouter', 'groq', 'together', 'fireworks', 'cerebras', 'ollama', 'lmstudio', 'vllm', 'azure-openai', 'perplexity', 'mistral', 'xai']) {
  registerProvider(provider, (config) => new OpenAICompatibleProvider(applyProviderPreset(config)));
}

export function registerProvider(id, factory) {
  if (!id || typeof factory !== 'function') throw new Error('registerProvider requires an id and factory');
  PROVIDERS.set(id, factory);
}

export function createModelProvider(modelConfig = {}) {
  const providerId = modelConfig.provider || 'openai-compatible';
  const presetConfig = applyProviderPreset(modelConfig);
  const factory = PROVIDERS.get(providerId);
  if (!factory) {
    throw new Error(`Unsupported provider: ${providerId}. Known providers: ${[...PROVIDERS.keys()].join(', ')}`);
  }
  return factory(presetConfig);
}

export function listProviderIds() {
  return [...PROVIDERS.keys()].sort();
}

export function enrichModelConfig(modelConfig = {}) {
  const presetConfig = applyProviderPreset(modelConfig);
  const capability = getModelCapability(presetConfig);
  return {
    ...presetConfig,
    capability
  };
}

function applyProviderPreset(modelConfig = {}) {
  const preset = getProviderPreset(modelConfig.provider);
  return {
    ...preset,
    ...modelConfig,
    headers: {
      ...(preset.headers || {}),
      ...(modelConfig.headers || {})
    },
    extraBody: {
      ...(preset.extraBody || {}),
      ...(modelConfig.extraBody || {})
    }
  };
}

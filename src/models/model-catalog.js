export const PROVIDER_PRESETS = {
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: true, reasoning: true }
  },
  'openai-compatible': {
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: false, streaming: false, vision: false, reasoning: false }
  },
  anthropic: {
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    apiVersion: '2023-06-01',
    supports: { jsonMode: false, tools: true, streaming: true, vision: true, reasoning: true }
  },
  claude: {
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    apiVersion: '2023-06-01',
    supports: { jsonMode: false, tools: true, streaming: true, vision: true, reasoning: true }
  },
  gemini: {
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GEMINI_API_KEY',
    supports: { jsonMode: true, tools: true, streaming: true, vision: true, reasoning: true }
  },
  qwen: {
    provider: 'qwen',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: true, reasoning: true }
  },
  dashscope: {
    provider: 'dashscope',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: true, reasoning: true }
  },
  minimax: {
    provider: 'minimax',
    baseUrl: 'https://api.minimax.io/v1',
    apiKeyEnv: 'MINIMAX_API_KEY',
    endpoint: '/text/chatcompletion_v2',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: false, reasoning: true }
  },
  deepseek: {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: false, reasoning: true }
  },
  kimi: {
    provider: 'kimi',
    baseUrl: 'https://api.moonshot.ai/v1',
    apiKeyEnv: 'MOONSHOT_API_KEY',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: true, reasoning: false }
  },
  moonshot: {
    provider: 'moonshot',
    baseUrl: 'https://api.moonshot.ai/v1',
    apiKeyEnv: 'MOONSHOT_API_KEY',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: true, reasoning: false }
  },
  openrouter: {
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: true, reasoning: true }
  },
  groq: {
    provider: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: false, reasoning: true }
  },
  together: {
    provider: 'together',
    baseUrl: 'https://api.together.xyz/v1',
    apiKeyEnv: 'TOGETHER_API_KEY',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: false, reasoning: true }
  },
  ollama: {
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: false, streaming: true, vision: false, reasoning: false }
  },
  lmstudio: {
    provider: 'lmstudio',
    baseUrl: 'http://127.0.0.1:1234/v1',
    apiKey: 'lm-studio',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: false, streaming: true, vision: false, reasoning: false }
  },
  vllm: {
    provider: 'vllm',
    baseUrl: 'http://127.0.0.1:8000/v1',
    apiKey: 'vllm',
    endpoint: '/chat/completions',
    jsonMode: true,
    supports: { jsonMode: true, tools: true, streaming: true, vision: false, reasoning: false }
  }
};

const MODEL_HINTS = [
  { match: /gpt|o\d|openai/i, supports: PROVIDER_PRESETS.openai.supports },
  { match: /claude/i, supports: PROVIDER_PRESETS.anthropic.supports },
  { match: /gemini/i, supports: PROVIDER_PRESETS.gemini.supports },
  { match: /qwen|qwq|dashscope/i, supports: PROVIDER_PRESETS.qwen.supports },
  { match: /deepseek/i, supports: PROVIDER_PRESETS.deepseek.supports },
  { match: /kimi|moonshot/i, supports: PROVIDER_PRESETS.kimi.supports },
  { match: /minimax/i, supports: PROVIDER_PRESETS.minimax.supports }
];

export function getProviderPreset(provider) {
  return PROVIDER_PRESETS[provider] || {};
}

export function listProviderPresets() {
  return Object.keys(PROVIDER_PRESETS).sort();
}

export function getModelCapability(config = {}) {
  const providerSupports = getProviderPreset(config.provider).supports || {};
  const modelName = String(config.model || config.name || '');
  const modelHint = MODEL_HINTS.find((item) => item.match.test(modelName));
  return {
    provider: config.provider || 'openai-compatible',
    model: config.model || config.name,
    supports: {
      jsonMode: Boolean(providerSupports.jsonMode ?? modelHint?.supports?.jsonMode ?? false),
      jsonSchema: Boolean(config.supports?.jsonSchema ?? false),
      tools: Boolean(config.supports?.tools ?? providerSupports.tools ?? modelHint?.supports?.tools ?? false),
      streaming: Boolean(config.supports?.streaming ?? providerSupports.streaming ?? modelHint?.supports?.streaming ?? false),
      vision: Boolean(config.supports?.vision ?? providerSupports.vision ?? modelHint?.supports?.vision ?? false),
      reasoning: Boolean(config.supports?.reasoning ?? providerSupports.reasoning ?? modelHint?.supports?.reasoning ?? false),
      promptCaching: Boolean(config.supports?.promptCaching ?? false)
    },
    limits: {
      maxInputTokens: Number(config.maxInputTokens || 0) || null,
      maxOutputTokens: Number(config.maxOutputTokens || 0) || null
    }
  };
}

export function providerConfigExamples() {
  return {
    openai: { provider: 'openai', model: 'gpt-4.1-mini', apiKeyEnv: 'OPENAI_API_KEY' },
    gemini: { provider: 'gemini', model: 'gemini-2.5-flash', apiKeyEnv: 'GEMINI_API_KEY' },
    anthropic: { provider: 'anthropic', model: 'claude-sonnet-4-5', apiKeyEnv: 'ANTHROPIC_API_KEY' },
    qwen: { provider: 'qwen', model: 'qwen-plus', apiKeyEnv: 'DASHSCOPE_API_KEY' },
    minimax: { provider: 'minimax', model: 'MiniMax-M2', apiKeyEnv: 'MINIMAX_API_KEY' },
    deepseek: { provider: 'deepseek', model: 'deepseek-chat', apiKeyEnv: 'DEEPSEEK_API_KEY' },
    kimi: { provider: 'kimi', model: 'kimi-k2-0711-preview', apiKeyEnv: 'MOONSHOT_API_KEY' },
    ollama: { provider: 'ollama', model: 'llama3.2', baseUrl: 'http://127.0.0.1:11434/v1' }
  };
}

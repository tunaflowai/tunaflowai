# Model Provider Registry

TunaFlowAI v0.4 adds a provider-aware model runtime. The model router still uses fallback chains, but each model now has provider metadata, capability metadata, health, usage, latency, cooldown, and attempts.

## Supported provider families

Native providers:

- `openai` / `openai-chat` through the OpenAI Chat Completions-compatible request shape
- `gemini` through the native Gemini `generateContent` API
- `anthropic` / `claude` through the native Anthropic Messages API
- `mock` for local deterministic tests and demos

OpenAI-compatible provider presets:

- `qwen` / `dashscope`
- `minimax`
- `deepseek`
- `kimi` / `moonshot`
- `openrouter`
- `groq`
- `together`
- `fireworks`
- `cerebras`
- `ollama`
- `lmstudio`
- `vllm`

These presets only configure request routing and known defaults. Real model names, API keys, and provider-specific options must be configured by the user.

## Example config

```json
{
  "models": [
    { "name": "openai-main", "provider": "openai", "apiKeyEnv": "OPENAI_API_KEY", "model": "gpt-4.1-mini", "enabled": true },
    { "name": "gemini-flash", "provider": "gemini", "apiKeyEnv": "GEMINI_API_KEY", "model": "gemini-2.5-flash", "enabled": true },
    { "name": "anthropic-sonnet", "provider": "anthropic", "apiKeyEnv": "ANTHROPIC_API_KEY", "model": "claude-sonnet-4-5", "enabled": true },
    { "name": "deepseek", "provider": "deepseek", "apiKeyEnv": "DEEPSEEK_API_KEY", "model": "deepseek-chat", "enabled": true },
    { "name": "local-mock-fallback", "provider": "mock", "behavior": "ok", "enabled": true }
  ],
  "chains": {
    "default": ["openai-main", "gemini-flash", "deepseek", "local-mock-fallback"],
    "cheap": ["gemini-flash", "deepseek", "local-mock-fallback"],
    "strong": ["anthropic-sonnet", "openai-main", "deepseek", "local-mock-fallback"]
  }
}
```

## Useful commands

```bash
node src/cli.js models catalog
node src/cli.js status
```

## Design notes

- Provider presets do not guarantee feature parity.
- The router records latency, usage, failures, successes, and cooldown status.
- `maxModelCallsPerEvent` still limits fallback attempts per event.
- JSON parsing failures are treated as model failures so fallback can continue.
- Native providers should be preferred when provider-specific features matter.

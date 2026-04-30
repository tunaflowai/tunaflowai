# Model selection

TunaFlowAI supports two routing levels:

1. `chain`: a fallback sequence such as `default`, `cheap`, `strong`, `coding`, `codex`, or `local`.
2. `model`: a direct configured model name, such as `openai-main`, `openai-codex-cli`, `deepseek`, or `ollama-local`.

The dashboard sends both fields through `/chat` and `/events`. The runtime prefers the direct `model` value when present, then falls back to `chain`, persona preferences, and the default chain.

Example API payload:

```json
{
  "text": "Review this codebase and summarize problems",
  "model": "openai-codex-cli",
  "chain": "coding"
}
```

Enable only the providers you really use. A disabled provider is listed in the catalog but skipped at runtime. OpenAI API continues to use `OPENAI_API_KEY`. OpenAI Codex uses local ChatGPT OAuth credentials from the Codex CLI and should keep `passOpenAiApiKey` set to `false`.

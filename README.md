# TunaFlow

TunaFlow is an open-source, event-driven work operating agent.

It is inspired by the idea of connecting chat and real work to AI agents, but the design goal is different:

```text
Observe real work -> keep compact state -> call models only when needed -> fallback if a model fails -> execute tools with permission -> verify and audit.
```

## Why TunaFlow exists

Most agent systems spend too many tokens because they send too much raw context into the model. TunaFlow keeps raw events in storage, then sends only compact work state into the model.

TunaFlow also treats model fallback as a first-class feature. If the primary model is down, slow, not configured, or returning bad output, the router can automatically try the next model in the chain.

## Current status

This is an MVP starter repo. It is usable for local demos and early development, not production automation yet.

Included now:

- Local HTTP gateway
- Event store
- State engine
- Context compressor
- Model router with fallback chain
- Mock provider
- OpenAI-compatible provider
- Tool registry
- Permission engine
- Audit log
- Demo for fallback behavior
- Node test suite

## Requirements

- Node.js 22+
- No npm dependencies for the MVP

## Quick start

```bash
npm test
npm run demo
npm run dev
```

Then send an event:

```bash
curl -s http://127.0.0.1:8787/chat \
  -H 'content-type: application/json' \
  -d '{"text":"Pantau pekerjaan saya dan hemat token"}'
```

Or send a terminal error event:

```bash
curl -s http://127.0.0.1:8787/events \
  -H 'content-type: application/json' \
  -d '{"type":"terminal.output","priority":"high","text":"Error: cannot find variable plans"}'
```

## Model fallback

Edit `config/tunaflow.config.example.json`.

```json
{
  "models": [
    {
      "name": "primary-openai-compatible",
      "provider": "openai-compatible",
      "baseUrl": "https://api.openai.com/v1",
      "apiKeyEnv": "OPENAI_API_KEY",
      "model": "YOUR_MODEL_NAME",
      "enabled": false
    },
    {
      "name": "local-mock-fallback",
      "provider": "mock",
      "behavior": "ok",
      "enabled": true
    }
  ],
  "chains": {
    "default": ["primary-openai-compatible", "local-mock-fallback"]
  }
}
```

If the first model fails, TunaFlow tries the next model. Failures, retries, cooldowns, and successes are recorded in `.tunaflow/audit.jsonl`.

## Core API

```text
GET  /health
GET  /state
GET  /events
GET  /audit
GET  /models
GET  /tools
POST /events
POST /chat
```

## Example event

```json
{
  "type": "terminal.output",
  "priority": "high",
  "text": "Error: cannot find variable plans in src/App.tsx"
}
```

## Project layout

```text
src/core/
  agent-runtime.js
  audit-log.js
  context-compressor.js
  event-store.js
  gateway.js
  model-router.js
  permission-engine.js
  state-engine.js
  tool-registry.js
src/models/
  mock-provider.js
  openai-compatible-provider.js
src/observers/
  file-watcher.js
  terminal-watcher.js
examples/
  demo.js
config/
  tunaflow.config.example.json
docs/
  ARCHITECTURE.md
  ROADMAP.md
```

## Safety defaults

- `send_reply`, `read_file`, `list_files`, and `inspect_state` are low risk.
- `write_file` and `edit_file` are medium risk and require approval by default.
- `run_command` is high risk and requires approval by default.
- Paths are restricted to the configured workspace.

## License

MIT

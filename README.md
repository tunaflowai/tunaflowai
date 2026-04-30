# TunaFlowAI

TunaFlowAI (package name: `tunaflow`) is an open-source, event-driven work operating agent for building safe, token-efficient AI automation.

```text
Observe real work -> keep compact state -> call models only when needed -> fallback if a model fails -> execute tools with permission -> verify and audit.
```

## Why TunaFlowAI exists

Most agent systems spend too many tokens because they send too much raw context into the model. TunaFlowAI keeps raw events in storage, then sends only compact work state into the model.

TunaFlowAI also treats model fallback as a first-class runtime feature. If the primary model is down, slow, not configured, or returning invalid JSON, the router automatically tries the next model in the chain.

## What makes TunaFlowAI different

- **Event-driven by default**: react to meaningful work events instead of constantly polling or re-sending full chat history.
- **Compact state, not raw history**: raw events stay in storage; the model receives a small work snapshot.
- **Model fallback chains**: route work through primary and fallback models with timeout, cooldown, health, and audit metadata.
- **Permission-first tools**: every tool has a risk level; medium/high-risk actions are approval-gated by default.
- **Approval execution flow**: pending actions can be approved or rejected through CLI or HTTP API.
- **Tamper-evident audit log**: audit entries include a hash chain so local logs can be verified.
- **Local-first MVP**: designed for local demos, experiments, and extension before production hardening.

## Current status

This is an MVP runtime, not production automation yet. It is now ready for a stronger open-source `v0.2` direction: local gateway, approvals, model fallback, compact context, and auditable tool execution.

Included now:

- Local HTTP gateway
- Event store
- State engine and task state
- Context compressor
- Model router with fallback chains and circuit-breaker cooldown
- Mock provider
- OpenAI-compatible provider
- Tool registry
- Permission engine
- Approval flow
- Tamper-evident audit log
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

Send a chat event:

```bash
curl -s http://127.0.0.1:8787/chat \
  -H 'content-type: application/json' \
  -d '{"text":"Watch my workspace and keep model usage efficient"}'
```

Send a terminal error event:

```bash
curl -s http://127.0.0.1:8787/events \
  -H 'content-type: application/json' \
  -d '{"type":"terminal.output","priority":"high","text":"Error: cannot find variable plans"}'
```

## CLI

```text
tunaflow init
tunaflow dev
tunaflow chat <text>
tunaflow emit <type> <text>
tunaflow status
tunaflow approvals [pending|approved|rejected]
tunaflow approve <approval_id> [note]
tunaflow reject <approval_id> [note]
tunaflow audit verify
tunaflow check
```

## Model fallback

Edit `config/tunaflow.config.example.json` or create `config/tunaflow.config.json`.

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
    "default": ["primary-openai-compatible", "local-mock-fallback"],
    "strong": ["primary-openai-compatible", "local-mock-fallback"],
    "cheap": ["local-mock-fallback"]
  }
}
```

If the first model fails, TunaFlowAI tries the next model. Failures, retries, cooldowns, and successes are recorded in `.tunaflow/audit.jsonl`.

## Core API

```text
GET  /health
GET  /state
GET  /runs
GET  /events
GET  /audit
GET  /audit/verify
GET  /models
GET  /tools
GET  /approvals?status=pending
POST /events
POST /chat
POST /approvals/:id/approve
POST /approvals/:id/reject
```

If `TUNAFLOW_API_TOKEN` is set, unsafe endpoints require:

```text
Authorization: Bearer $TUNAFLOW_API_TOKEN
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
  COMPARISON.md
  DEMO.md
  PRODUCTIZATION.md
  ROADMAP.md
```

## Safety defaults

- `send_reply`, `read_file`, `list_files`, and `inspect_state` are low risk.
- `write_file`, `append_file`, and `edit_file` are medium risk and require approval by default.
- `run_command` is high risk and requires approval by default.
- Paths are restricted to the configured workspace.
- Shell commands use `execFile`, an allowlist, timeouts, and a sanitized environment.
- Audit logs redact obvious secret patterns and are hash-chain verifiable.

## License

MIT

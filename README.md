# TunaFlowAI

TunaFlowAI (package name: `tunaflow`) is an open-source, event-driven work operating agent for building safe, token-efficient AI automation.

It is designed around one loop:

```text
Observe real work -> keep compact state -> call models only when needed -> fallback if a model fails -> select relevant skills -> execute tools with permission -> verify and audit.
```

## What makes TunaFlowAI different

- **Event-driven by default**: TunaFlowAI reacts to meaningful work events instead of constantly polling or re-sending full chat history.
- **Compact state, not raw history**: raw events stay in storage; models receive a small work snapshot.
- **Provider-aware model fallback**: route work through OpenAI, Gemini, Anthropic, Qwen, MiniMax, DeepSeek, Kimi/Moonshot, OpenRouter, Ollama, and other OpenAI-compatible endpoints.
- **Skills without token bloat**: select only relevant workflow skills for each event.
- **Channel adapter layer**: webhook, Telegram, Discord, Slack, and WhatsApp Cloud foundations.
- **Permission-first tools**: every tool has a risk level; medium/high-risk actions are approval-gated by default.
- **Tamper-evident audit logs**: every important event, model attempt, approval, and tool result can be verified.

## Current status

This is a v0.3 alpha foundation. It is usable for local demos and early development, not production autonomous automation yet.

Included now:

- Local HTTP gateway
- Event store
- State engine
- Context compressor
- Model router with fallback chain
- Provider registry and model catalog
- Native Gemini provider
- Native Anthropic provider
- OpenAI-compatible provider presets for Qwen, MiniMax, DeepSeek, Kimi/Moonshot, OpenRouter, Ollama, and more
- Skill loader/selector with bundled skills
- Channel registry and outbound router
- Webhook, Telegram, Discord, Slack, and WhatsApp Cloud adapter foundations
- Permission engine and approval execution
- Tool registry
- Tamper-evident audit log
- Demo and test suite

## Requirements

- Node.js 22+
- No npm dependencies for the current runtime foundation

## Quick start

```bash
npm test
npm run demo
npm run dev
```

Then send a chat event:

```bash
curl -s http://127.0.0.1:8787/chat \
  -H 'content-type: application/json' \
  -d '{"text":"Watch my workspace and keep model usage efficient"}'
```

Or send a terminal error event:

```bash
curl -s http://127.0.0.1:8787/events \
  -H 'content-type: application/json' \
  -d '{"type":"terminal.output","priority":"high","text":"Error: cannot find variable plans"}'
```

## Core API

```text
GET  /health
GET  /state
GET  /runs
GET  /events
GET  /audit
GET  /audit/verify
GET  /models
GET  /models/catalog
GET  /tools
GET  /skills
GET  /channels
GET  /approvals
POST /approvals/:id/approve
POST /approvals/:id/reject
POST /events
POST /chat
POST /channels/:id/webhook
```

Set `TUNAFLOW_API_TOKEN` to protect unsafe endpoints with `Authorization: Bearer <token>`.

## Model providers

Edit `config/tunaflow.config.example.json`.

```json
{
  "models": [
    { "name": "openai-main", "provider": "openai", "apiKeyEnv": "OPENAI_API_KEY", "model": "YOUR_OPENAI_MODEL", "enabled": false },
    { "name": "gemini-flash", "provider": "gemini", "apiKeyEnv": "GEMINI_API_KEY", "model": "YOUR_GEMINI_MODEL", "enabled": false },
    { "name": "anthropic-sonnet", "provider": "anthropic", "apiKeyEnv": "ANTHROPIC_API_KEY", "model": "YOUR_CLAUDE_MODEL", "enabled": false },
    { "name": "deepseek", "provider": "deepseek", "apiKeyEnv": "DEEPSEEK_API_KEY", "model": "YOUR_DEEPSEEK_MODEL", "enabled": false },
    { "name": "local-mock-fallback", "provider": "mock", "behavior": "ok", "enabled": true }
  ],
  "chains": {
    "default": ["openai-main", "gemini-flash", "deepseek", "local-mock-fallback"],
    "strong": ["anthropic-sonnet", "openai-main", "deepseek", "local-mock-fallback"]
  }
}
```

Useful commands:

```bash
node src/cli.js models catalog
node src/cli.js status
```

## Skills

Skills are instruction-only workflow procedures. They do not grant permissions and cannot access secrets.

Bundled skills:

- `terminal-debugger`
- `code-reviewer`
- `daily-reporter`
- `customer-support-drafter`
- `browser-researcher`

```bash
node src/cli.js skills
```

See `docs/SKILLS.md`.

## Channels

Channel adapters normalize inbound messages into TunaFlow events and route `send_reply` back to the right destination.

```bash
node src/cli.js channels
```

Current adapter foundations:

- webhook / webchat
- Telegram
- Discord
- Slack
- WhatsApp Cloud

See `docs/CHANNELS.md`.

## Safety defaults

- `send_reply`, `read_file`, `list_files`, and `inspect_state` are low risk.
- `write_file`, `append_file`, and `edit_file` are medium risk and require approval by default.
- `run_command` is high risk and requires approval by default.
- Paths are restricted to the configured workspace.
- Commands are allowlisted and basic deny patterns are enforced.
- This is not a hostile multi-tenant sandbox yet.

## Documentation

- `docs/ARCHITECTURE.md` - runtime architecture and core loop
- `docs/MODELS.md` - provider registry and fallback configuration
- `docs/SKILLS.md` - skill format, loading, selection, and safety
- `docs/CHANNELS.md` - channel adapter layer
- `docs/MATURITY_PLAN.md` - remaining work toward product maturity
- `docs/COMPARISON.md` - positioning against broader agent frameworks
- `docs/DEMO.md` - local demo commands and expected behavior
- `docs/ROADMAP.md` - planned milestones
- `SECURITY.md` - current safety model and limitations
- `CONTRIBUTING.md` - contribution guide

## Additional hardening docs

- `docs/THREAT_MODEL.md` — current trust boundaries and production blockers
- `docs/PRODUCT_SPEC.md` — product direction and requirements
- `docs/HARDENING_REPORT.md` — v0.2 hardening notes

## License

MIT

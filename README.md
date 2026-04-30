# TunaFlowAI

TunaFlowAI (package name: `tunaflow`) is an open-source, event-driven AI work operating agent for building safe, token-efficient automation.

The core loop is:

```text
Observe real work
  -> keep compact state
  -> initialize the active persona
  -> call models only when needed
  -> fallback if a model fails
  -> select relevant job skills
  -> execute tools with permission
  -> verify and audit
```

## What makes TunaFlowAI different

- **Persona-based initialization**: users can switch the active persona at runtime, such as `operator`, `anna`, `software-engineer`, `code-reviewer`, `system-operator`, `customer-support`, `research-analyst`, or `product-manager`.
- **Event-driven by default**: TunaFlowAI reacts to meaningful work events instead of constantly polling or re-sending full chat history.
- **Compact state, not raw history**: raw events stay in storage; models receive a small work snapshot.
- **Provider-aware model fallback**: route work through OpenAI, Gemini, Anthropic, Qwen, MiniMax, DeepSeek, Kimi/Moonshot, OpenRouter, Ollama, and other OpenAI-compatible endpoints.
- **Installable job skills**: job skill packs can be loaded from bundled skills, workspace folders, user folders, custom paths, or acquired into `.tunaflow/skills/acquired`.
- **Channel adapter layer**: webhook, Telegram, Discord, Slack, and WhatsApp Cloud foundations.
- **Permission-first tools**: every tool has a risk level; medium/high-risk actions are approval-gated by default.
- **Localhost dashboard**: open `http://127.0.0.1:8787/dashboard` to inspect state, logs, runs, approvals, personas, skills, models, and channels.
- **Tamper-evident audit logs**: important events, model attempts, approvals, and tool results can be verified.

## Current status

This is a `v0.4.0-alpha` foundation. It is usable for local demos, experiments, and early extension work, not production autonomous automation yet.

Included now:

- Local HTTP gateway
- Localhost dashboard GUI
- Event store
- State engine
- Context compressor
- Persona manager with bundled personas and runtime switching
- Model router with fallback chain
- Provider registry and model catalog
- Native Gemini provider
- Native Anthropic provider
- OpenAI-compatible provider presets for Qwen, MiniMax, DeepSeek, Kimi/Moonshot, OpenRouter, Ollama, and more
- Skill loader/selector with bundled and acquired job skills
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

Open the dashboard:

```text
http://127.0.0.1:8787/dashboard
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

## Personas

List personas:

```bash
node src/cli.js personas
```

Show the active persona:

```bash
node src/cli.js persona active
```

Switch persona:

```bash
node src/cli.js persona set anna
node src/cli.js persona set software-engineer
node src/cli.js persona set customer-support
```

The active persona influences:

- system prompt initialization,
- model chain preference,
- default job skill selection,
- communication style,
- risk posture and autonomy hints.

Persona instructions cannot override the permission engine, tool policy, or safety rules.

## Job skills

List skills:

```bash
node src/cli.js skills
```

Create a starter job skill:

```bash
node src/cli.js skills create receipt-auditor
```

Acquire a local skill pack:

```bash
node src/cli.js skills acquire ./external-skills/receipt-auditor
```

A skill pack is a folder containing `SKILL.md`. Skills are procedures; they do not grant tool permissions.

## Dashboard

Start TunaFlowAI:

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:8787/dashboard
```

The dashboard shows:

- active persona and persona switcher,
- loaded/acquired job skills,
- approval queue,
- model health and fallback attempts,
- compact state,
- recent runs,
- recent events,
- audit log.

If `TUNAFLOW_API_TOKEN` is set, paste it into the dashboard token field.

## Core API

```text
GET  /
GET  /dashboard
GET  /health
GET  /overview
GET  /state
GET  /runs
GET  /events
GET  /audit
GET  /audit/verify
GET  /models
GET  /models/catalog
GET  /tools
GET  /skills
GET  /skills/acquired
GET  /personas
GET  /personas/active
GET  /personas/current
GET  /channels
GET  /approvals
POST /personas/:name/activate
POST /personas/:id/skills/acquire
POST /personas/:id/skills/release
POST /skills/acquire
POST /skills/reload
POST /approvals/:id/approve
POST /approvals/:id/reject
POST /events
POST /chat
POST /channels/:id/webhook
```

Set `TUNAFLOW_API_TOKEN` to protect unsafe endpoints with `Authorization: Bearer <token>`.

## Safety defaults

- `send_reply`, `read_file`, `list_files`, and `inspect_state` are low risk.
- `write_file`, `edit_file`, and `append_file` are medium risk and require approval by default.
- `run_command` is high risk and requires approval by default.
- Paths are restricted to the configured workspace.
- Personas and skills cannot grant permissions.
- Remote skill installation is intentionally disabled in this dependency-free alpha. Review skills locally before acquiring them.

## Documentation

- `docs/ARCHITECTURE.md` - runtime architecture and core loop
- `docs/PERSONAS.md` - persona-based initialization and switching
- `docs/SKILL_JOBS.md` - installable job skill packs
- `docs/DASHBOARD.md` - localhost GUI usage
- `docs/MODELS.md` - model provider setup
- `docs/CHANNELS.md` - channel adapter foundations
- `docs/ROADMAP.md` - planned milestones
- `SECURITY.md` - current safety model and limitations
- `CONTRIBUTING.md` - contribution guide

## License

MIT

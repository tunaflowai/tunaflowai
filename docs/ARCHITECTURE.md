# TunaFlowAI Architecture

TunaFlowAI is a local-first, event-driven AI work operating agent.

```text
Work event
  -> Gateway / Channel adapter
  -> EventStore
  -> StateEngine
  -> SkillSelector
  -> ContextCompressor
  -> ModelRouter with fallback chain
  -> AgentRuntime plan validation
  -> PermissionEngine
  -> ToolRegistry / OutboundRouter
  -> Verification
  -> AuditLog
```

## Core runtime

### EventStore

Stores raw work events as JSONL. Raw events are preserved for audit and replay, but they are not automatically sent to models.

### StateEngine

Maintains compact work state:

- active task
- last user instruction
- current file/page
- recent errors
- recent events
- recent runs

### ContextCompressor

Builds a token-efficient snapshot for the model. It includes the current event, compact state, selected skills, and tool policy constraints.

### SkillSelector

Scores skills against the event and state, then selects only a small number of relevant skills. This prevents prompt bloat while allowing workflow-specific behavior.

### ModelRouter

Routes a model request through a fallback chain. It tracks:

- attempts
- success/failure count
- cooldown
- latency
- token usage
- capability metadata

JSON parsing failures happen inside the model attempt path, so a bad JSON answer can trigger fallback.

### PermissionEngine

Every tool has a risk level:

- low: can execute automatically
- medium: approval by default
- high: approval by default
- critical: blocked by default

Approvals are stored as JSON files and can be resolved by CLI or HTTP API.

### ToolRegistry

Built-in tools include:

- `send_reply`
- `inspect_state`
- `list_files`
- `read_file`
- `write_file`
- `append_file`
- `edit_file`
- `run_command`

### ChannelRegistry and OutboundRouter

Channel adapters normalize messages into events and allow `send_reply` to respond through the same channel when possible.

Current adapters:

- webhook/webchat
- Telegram
- Discord
- Slack
- WhatsApp Cloud

### AuditLog

Audit entries are append-only JSONL entries with hash chaining. Use `node src/cli.js audit verify` to validate the chain.

## API surface

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

## Trust model

The current runtime is suitable for local trusted development. It is not yet a hostile multi-tenant platform. The next major hardening milestones are sandboxed command execution, policy-as-code, signatures for third-party extensions, and stronger channel auth.

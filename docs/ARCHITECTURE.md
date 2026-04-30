# TunaFlowAI Architecture

TunaFlowAI is an event-driven work operating agent runtime.

```text
Work event
  -> EventStore
  -> StateEngine
  -> PersonaManager
  -> SkillSelector
  -> ContextCompressor
  -> ModelRouter with fallback
  -> AgentRuntime plan
  -> PermissionEngine
  -> ToolRegistry / Channel OutboundRouter
  -> Verification
  -> AuditLog
  -> Dashboard / API
```

## Core modules

```text
src/core/
  agent-runtime.js        model/tool loop
  gateway.js              localhost HTTP API and dashboard server
  event-store.js          JSONL event storage
  state-engine.js         compact work state, tasks, runs
  context-compressor.js   compact model context builder
  model-router.js         provider-aware fallback routing
  permission-engine.js    risk policy and approval queue
  tool-registry.js        built-in tools
  audit-log.js            tamper-evident hash chain

src/personas/
  persona-manager.js      persona loading, active persona state, switching
  bundled/*/PERSONA.md    built-in personas

src/skills/
  skill-loader.js         bundled/workspace/user/acquired skills
  skill-selector.js       event/persona-aware skill selection
  bundled/*/SKILL.md      built-in job skills

src/models/
  provider-registry.js    provider factory
  model-catalog.js        provider presets and examples
  providers/*             native Gemini/Anthropic providers

src/channels/
  channel-registry.js     channel adapter registry
  outbound-router.js      channel-aware outbound replies
  adapters/*              webhook, Telegram, Discord, Slack, WhatsApp Cloud foundations

src/dashboard/
  dashboard.js            dependency-free localhost GUI
```

## Persona layer

The active persona initializes the agent behavior for each run. It is injected into system prompt and compact context.

Personas influence:

```text
- role and communication style
- default job skills
- preferred model chains
- risk posture hints
- autonomy hints
```

Personas cannot override:

```text
- permission engine
- tool risk levels
- workspace boundaries
- model/provider config
- audit logging
```

## Skill/job layer

Skills are workflow instructions selected per event. They are lazy-selected so TunaFlowAI does not inject every skill into every prompt.

```text
all skills -> score by event + active persona + task state -> select top N -> inject only selected skills
```

Acquired skills are local-first and copied into:

```text
.tunaflow/skills/acquired
```

## Dashboard layer

The gateway serves a local dashboard at:

```text
http://127.0.0.1:8787/dashboard
```

The dashboard uses existing JSON endpoints for state, runs, events, audit logs, approvals, personas, skills, models, and channels.

## Safety model

TunaFlowAI is approval-first:

```text
low risk tools      -> execute automatically
medium risk tools   -> approval by default
high risk tools     -> approval by default
critical tools      -> block by default
```

The v0.4 runtime is still local-first alpha software. Do not expose it as a hostile multi-tenant automation platform until sandboxing, secrets management, auth roles, and policy-as-code are implemented.

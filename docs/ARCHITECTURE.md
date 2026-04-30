# TunaFlowAI Architecture

TunaFlowAI is an event-driven work operating agent. The goal is to monitor real work, keep compact state, call models only when necessary, and execute actions through a permissioned tool layer.

## Core loop

```text
Observer event
  -> Event store
  -> State engine
  -> Context compressor
  -> Model router with fallback chain
  -> Agent planner JSON
  -> Permission engine
  -> Tool executor
  -> Verification check
  -> Audit log
```

## Main runtime components

- `event-store`: append-only JSONL event timeline.
- `state-engine`: compact work state, active task, recent errors, recent runs.
- `context-compressor`: creates small model input from state and current event.
- `model-router`: tries a configured model chain and falls back on timeout, network error, HTTP error, invalid config, or invalid JSON.
- `tool-registry`: tools with risk levels, basic argument validation, workspace path boundaries, and audited execution.
- `permission-engine`: approval-first policy for medium and high risk actions.
- `agent-runtime`: orchestrates one event into one run and can execute approved pending actions.
- `gateway`: local HTTP API for events, chat, state, models, audit, and approvals.
- `audit-log`: tamper-evident local audit trail using a hash chain.

## Model fallback design

A chain is a named list of model configs.

```json
{
  "chains": {
    "default": ["primary", "fallback-local"],
    "strong": ["primary-strong", "primary", "fallback-local"],
    "cheap": ["fallback-local"]
  }
}
```

For each event, TunaFlowAI selects a chain, then tries models in order. A model is skipped if disabled or in cooldown. Failures are recorded in audit logs and model health.

Fallback also handles invalid JSON when `json: true`, which is important because the agent runtime expects a structured plan.

## Token efficiency principles

1. Events are stored raw, but only compact state goes to the model.
2. Model calls are event-triggered, not polling-based.
3. Cheap chains can be used for low-priority events.
4. Context is compressed before planning.
5. Tool results and state updates are stored outside the model context.
6. `maxModelCallsPerEvent` prevents runaway fallback chains.

## Approval flow

```text
Model proposes action
  -> Permission engine evaluates risk
  -> Low risk: execute immediately
  -> Medium/high risk: write pending approval file
  -> User approves/rejects via CLI or API
  -> Approved action executes with audit record
```

CLI:

```bash
tunaflow approvals pending
tunaflow approve appr_xxx "looks good"
tunaflow reject appr_xxx "too risky"
```

HTTP:

```text
GET  /approvals?status=pending
POST /approvals/:id/approve
POST /approvals/:id/reject
```

## Audit chain

Each audit entry includes:

- sequence number,
- previous hash,
- current hash,
- redacted payload.

Verify it with:

```bash
tunaflow audit verify
```

## Current limitations

- The MVP stores data locally in JSON/JSONL files.
- The gateway is local-first and should not be exposed directly to the public internet.
- Approval flows are runtime-level primitives, not a finished web UI.
- The mock provider is intended for deterministic demos and tests.
- Production use still needs sandboxing, stronger secret handling, authentication roles, plugin signing, observability, and network controls.

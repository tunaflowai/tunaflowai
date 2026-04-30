# TunaFlow Architecture

TunaFlow is an event-driven work operating agent. The goal is to monitor real work, keep compact state, call models only when necessary, and execute actions through a permissioned tool layer.

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
  -> Audit log
```

## Main packages

- `event-store`: append-only JSONL event timeline.
- `state-engine`: compact work state, not raw chat history.
- `context-compressor`: creates small model input.
- `model-router`: tries a configured model chain and falls back on timeout, network error, HTTP error, invalid config, or invalid JSON.
- `tool-registry`: typed-ish tools with risk levels.
- `permission-engine`: approval-first policy for medium and high risk actions.
- `agent-runtime`: orchestrates one event into one run.
- `gateway`: local HTTP API.

## Model fallback design

A chain is a named list of model configs.

```json
{
  "chains": {
    "default": ["primary", "fallback-local"],
    "strong": ["primary-strong", "primary", "fallback-local"]
  }
}
```

For each event, TunaFlow selects a chain, then tries models in order. A model is skipped if disabled or in cooldown. Failures are recorded in audit logs and model health.

## Token efficiency principles

1. Events are stored raw, but only compact state goes to the model.
2. Model calls are event-triggered, not polling-based.
3. Cheap chains can be used for low priority events.
4. Context is compressed before planning.
5. Tool results and state updates are stored outside the model context.

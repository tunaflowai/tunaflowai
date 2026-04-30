# TunaFlowAI Product Spec

## One-line positioning

TunaFlowAI is a local-first work operating agent that watches real work events, keeps compact state, routes tasks through fallback model chains, and executes tools through approval-gated permissions.

## Product promise

TunaFlowAI should help developers build AI workers that:

1. do not waste tokens on repeated raw context,
2. survive model/provider failures,
3. can act through tools,
4. require approval for risky actions,
5. leave an audit trail users can inspect.

## Primary users

- Developers building local AI work assistants
- Open-source contributors experimenting with agent runtimes
- Automation builders who need model fallback and tool gating
- Teams exploring local-first agent infrastructure before hosted deployment

## Non-goals for the MVP

- Hosted SaaS dashboard
- Multi-tenant security boundary
- Payments or billing
- Fully autonomous web/browser operation
- Adversarial sandbox guarantees

## Core concepts

### Event

A normalized unit of work observation, such as a chat message, terminal output, file change, or browser page change.

### State

A compact work snapshot derived from events. State is what TunaFlowAI sends to models instead of raw history.

### Model chain

An ordered list of model configurations. The router tries each usable model until one succeeds or the chain is exhausted.

### Tool

A capability the agent can invoke. Every tool must declare a risk level.

### Approval

A persisted decision request for a medium/high-risk tool action.

### Audit log

An append-only JSONL log of important runtime actions.

## v0.2 acceptance criteria

- Model router tracks attempts, successes, failures, latency, and token usage.
- `maxModelCallsPerEvent` is enforced.
- Gateway supports optional API key authentication.
- Gateway rejects oversized request bodies.
- Approval records can be listed, approved, rejected, and resumed.
- Medium/high-risk actions are gated by default.
- Tests cover fallback, budget limits, and approval execution.
- CI runs on GitHub Actions for Node.js 22 and 24.

## v0.3 acceptance criteria

- Verification loop exists for tool outcomes.
- Task graph stores active goals, subtasks, evidence, and next actions.
- Browser observer can emit URL/title/DOM-summary events.
- Budget manager tracks per-task model calls and token spend.
- Dashboard shows event timeline, runs, approvals, model health, and audit events.

## v1.0 acceptance criteria

- Sandbox runner for commands and browser automation.
- Secrets vault abstraction.
- Policy-as-code permission system.
- Tamper-evident audit log.
- Plugin SDK with capability manifest.
- Stable CLI and config schema.
- Production hardening guide.

# TunaFlowAI v0.2 Hardening Report

This patch turns the MVP into a stronger product foundation without adding runtime dependencies.

## Added

- Optional gateway API key auth through `TUNAFLOW_API_KEY`
- Safer CORS default
- Request body size limit
- `/approvals` list endpoint
- `/approvals/:id/approve` endpoint
- `/approvals/:id/reject` endpoint
- Runtime approval resumption
- Model health metrics: attempts, successes, failures, latency, token usage
- Enforcement for `maxModelCallsPerEvent`
- Safer command execution environment
- Command blocklist for high-risk default operations
- Product spec
- Threat model
- CI workflow
- Issue templates
- Pull request template
- Code of conduct
- Additional tests

## Still not production-ready

- No sandbox runner yet
- No dashboard approval center yet
- No browser operator yet
- No policy-as-code DSL yet
- No tamper-evident audit hash chain yet
- No secrets vault yet

## Suggested next PRs

1. Dashboard: approvals, audit timeline, model health.
2. Sandbox runner: containerized command execution.
3. Verification loop: tool result -> model or rule-based verifier -> next action.
4. Task graph: project/task/subtask/evidence storage.
5. Plugin manifest: tools declare capabilities and permissions.

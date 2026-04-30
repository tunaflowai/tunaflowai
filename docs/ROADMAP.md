# TunaFlowAI Roadmap

## v0.1 - Local MVP

- Local gateway
- Event store
- State engine
- Context compressor
- Model fallback chain
- Mock and OpenAI-compatible providers
- Tool registry
- Permission engine
- Audit log

## v0.2 - Productization foundation

- English-first docs and demos
- Approval CLI and HTTP API
- Tamper-evident audit log
- Stronger model health metadata
- `maxModelCallsPerEvent` enforcement
- Tool argument validation
- Safer command execution defaults
- API token support for local gateway
- More tests around approvals and audit verification

## v0.3 - Real observers

- Recursive file watcher
- Terminal watcher with structured error extraction
- Browser observer
- Active app/window observer
- Web dashboard
- Approval center UI

## v0.4 - Work execution

- Verification loop v2
- Task graph
- Budget manager per task
- Browser operator
- Git workflow tools
- Report generator
- Replayable run traces

## v0.5 - Plugin ecosystem

- Tool plugin SDK
- Channel plugin SDK
- Observer plugin SDK
- Signed plugin manifest
- Capability-based permissions
- Plugin test harness

## v1.0 - Production hardening

- Multi-tenant mode
- Secrets vault
- Sandbox runner
- Immutable remote audit log option
- Policy-as-code
- Observability dashboard
- Hosted deployment profile

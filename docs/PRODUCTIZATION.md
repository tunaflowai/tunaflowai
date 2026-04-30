# Productization Plan

This document turns TunaFlowAI from a promising MVP into a product-grade open-source runtime.

## Product promise

TunaFlowAI should be the runtime for developers who want a local-first AI worker that:

- observes work events,
- keeps compact state,
- routes to fallback models automatically,
- executes tools only through permissions,
- verifies results,
- records every important step.

## Release gates

### v0.2 gate

- All tests pass.
- README is English-first.
- Approval flow works through CLI and API.
- Audit verification works.
- Unsafe endpoints can be protected with an API token.
- No high-risk tool auto-executes by default.

### v0.3 gate

- File watcher is recursive and configurable.
- Terminal watcher extracts structured errors.
- Browser observer can report current URL/title and selected DOM snippets.
- Basic dashboard shows state, runs, approvals, and audit health.

### v0.4 gate

- Browser operator can click/type/extract with approval gates.
- Task graph exists as a first-class runtime object.
- Per-task token/cost budget manager exists.
- Run traces are replayable.

### v1.0 gate

- Sandbox runner for commands and browser tools.
- Signed plugin manifests.
- Secrets vault.
- Policy-as-code.
- Production deployment guide.
- Security review checklist.

## What not to build too early

- Too many chat channels.
- Hosted multi-tenant mode before sandboxing.
- Plugin marketplace before signed manifests.
- Full browser autonomy before approval UX is excellent.

## Immediate GitHub issues to create

1. Build approval center UI.
2. Add recursive file watcher.
3. Add structured terminal error parser.
4. Add browser observer using Playwright.
5. Add sandbox runner for `run_command`.
6. Add task graph and budget manager.
7. Add provider adapters for Anthropic, Gemini, Ollama, and OpenRouter.
8. Add run trace viewer.
9. Add plugin manifest spec.
10. Add security threat model document.

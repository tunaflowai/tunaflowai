# Maturity Plan

This package moves TunaFlowAI toward v0.3, but it is still not a fully production-safe autonomous worker. The highest-impact remaining work is below.

## v0.3 closeout

- Add provider integration tests with mocked HTTP responses.
- Add endpoint tests for `/models/catalog`, `/skills`, `/channels`, and `/channels/:id/webhook`.
- Add per-channel allowlist policies.
- Add model cost metadata and per-run cost estimates.
- Add stricter JSON schema validation for plans.

## v0.4

- Dashboard: approvals, runs, audit, models, skills, channels.
- Skill allowlist UI and skill trust warnings.
- Browser observer/operator with approval-gated form submission.
- Task graph and per-task budgets.

## v0.5

- Plugin SDK for tools, providers, skills, and channels.
- Signed plugin/skill manifest.
- Secrets vault.
- Provider-specific capability probes.

## v1.0

- Sandbox runner for command execution.
- Network egress policy.
- Role-based auth.
- Remote tamper-evident audit option.
- Production deployment guide.

# Security Policy

TunaFlowAI is an automation agent. Treat all tools as capabilities that can affect real systems.

## Current safety model

- Low-risk tools run automatically.
- Medium-risk tools require approval by default.
- High-risk tools require approval by default.
- Critical-risk tools are blocked by default.
- Shell commands are allowlisted and approval-gated.
- Command execution uses `execFile`, not a shell string.
- File paths are constrained to the configured workspace.
- API access can be protected with `TUNAFLOW_API_TOKEN`.
- Audit logs redact obvious secret patterns.
- Audit entries are chained with hashes and can be verified with `tunaflow audit verify`.

## Important limitations

Do not use the current MVP as a hostile multi-tenant sandbox. Run it only in a trusted local workspace until the sandbox layer is implemented.

Still needed before production-grade autonomous usage:

- sandbox runner for commands and browser automation,
- stronger secret storage,
- policy-as-code,
- signed plugins,
- network egress controls,
- immutable remote audit storage,
- authentication and user/session roles for hosted deployments.

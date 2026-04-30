# Security Policy

TunaFlow is an automation agent. Treat all tools as capabilities that can affect real systems.

Default safety choices:

- Low risk tools run automatically.
- Medium risk tools require approval by default.
- High risk tools require approval by default.
- Shell commands are allowlisted and approval-gated.
- File paths are constrained to the workspace.
- Audit logs redact obvious secret patterns.

Do not use the MVP as a hostile multi-tenant sandbox. Run it only in a trusted local workspace until the sandbox layer is implemented.

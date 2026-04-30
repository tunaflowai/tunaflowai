# Security Policy

TunaFlowAI is currently a local-first alpha runtime. It is designed for trusted local development and demos, not hostile multi-tenant automation.

## Current protections

- Local gateway binds to `127.0.0.1` by default.
- Unsafe endpoints can be protected with `TUNAFLOW_API_TOKEN`.
- Request body size is limited.
- File tools are restricted to the configured workspace.
- Medium/high-risk tools require approval by default.
- Critical tools are blocked by default.
- `run_command` uses allowlisted command names, a sanitized environment, timeouts, and basic deny patterns.
- Audit logs are tamper-evident through hash chaining.
- Skills are instruction-only and cannot grant permissions.
- Workspace/user skills are disabled by default.

## Current limitations

- `run_command` is not yet a real sandbox.
- No Docker/gVisor/Firecracker isolation is included yet.
- No secrets vault is included yet.
- Channel adapters are minimal foundations and do not implement every provider security best practice.
- Slack signature verification and WhatsApp signature verification still need production implementation.
- No role-based auth or multi-tenant isolation yet.
- Third-party skills/plugins are not signed yet.

## Safe usage guidance

- Run TunaFlowAI only in a trusted local workspace.
- Do not enable auto-approval for high-risk tools unless you fully understand the risk.
- Do not expose the gateway publicly without a reverse proxy, auth, and TLS.
- Do not store API keys inside skills or prompts.
- Review pending approvals before executing edits or commands.

## Report a vulnerability

Please open a private security advisory on GitHub or contact the maintainers through the repository security channel.

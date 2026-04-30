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

## Persona and skill safety

TunaFlowAI v0.4 adds personas and acquired job skills.

Personas and skills are behavioral instructions only. They do not grant capabilities. The permission engine, tool risk levels, workspace boundaries, and audit log remain authoritative.

Remote skill acquisition is disabled in the dependency-free alpha. Review third-party skill folders locally before acquiring them with `tunaflow skills acquire`.

Recommended review checklist for third-party skills/personas:

```text
- no instruction to bypass approvals
- no instruction to reveal secrets
- no install script requirement
- no hidden network exfiltration instruction
- no request to disable audit logging
- minimal declared tool requirements
```

The localhost dashboard is intended for trusted local use. If `TUNAFLOW_API_TOKEN` is configured, unsafe endpoints require `Authorization: Bearer <token>`. Do not expose the dashboard directly to the public internet.

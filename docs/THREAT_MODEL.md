# TunaFlowAI Threat Model

TunaFlowAI is an automation runtime. Even local-first tools can affect real files, commands, messages, and accounts. This document defines the current trust boundaries and what must be hardened before production use.

## Current trust model

The MVP assumes:

- It runs in a trusted local workspace.
- The local machine user controls the runtime.
- The gateway is bound to `127.0.0.1` by default.
- Medium and high risk tools require approval unless the user explicitly changes config.

The MVP does not claim to be a hostile multi-tenant sandbox.

## Assets to protect

- Local files inside and near the workspace
- API keys and environment variables
- Terminal command execution
- User intent and task state
- Audit log integrity
- Model provider credentials
- Future browser sessions and cookies

## Main risks

### Prompt injection

Untrusted text from files, websites, terminal logs, or chat messages may instruct the model to ignore policies or exfiltrate data.

Mitigations now:

- Permission engine outside the model
- Tool risk levels
- Approval-gated medium/high-risk actions
- Workspace path checks

Needed later:

- Source labeling in context
- Prompt-injection detectors
- Tool-specific data egress policies

### Command execution abuse

The `run_command` tool can affect the workspace.

Mitigations now:

- High risk by default
- Approval-gated by default
- Command allowlist
- Dangerous pattern blocklist
- `execFile` instead of shell interpolation
- Sanitized environment variables

Needed later:

- Container sandbox
- Network egress controls
- Read-only workspace mounts for analysis tasks
- Per-tool resource limits

### Gateway exposure

If exposed beyond localhost, the gateway can reveal state and trigger actions.

Mitigations now:

- Localhost default
- Optional API key auth
- Bounded request body size
- Safer CORS default

Needed later:

- Mandatory auth when host is not localhost
- Rate limiting
- CSRF strategy for browser dashboard
- TLS termination guidance

### Secret leakage

Model prompts, tool outputs, and logs may contain secrets.

Mitigations now:

- Audit log redacts common secret patterns
- Command execution receives a reduced environment

Needed later:

- Secrets vault
- Sensitive value tainting
- Provider-specific log redaction
- User-visible secret scan warnings

## Production hardening blockers

Do not advertise TunaFlowAI as production autonomous automation until these exist:

- Sandbox runner
- Stronger auth and dashboard session model
- Approval center UI
- Policy-as-code
- Tamper-evident audit log
- Secrets vault
- Browser isolation
- Plugin capability manifests

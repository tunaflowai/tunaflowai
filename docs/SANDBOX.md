# Sandbox Runner

The `run_command` tool is high risk and approval-gated. In v0.5, TunaFlowAI adds a sandbox runner foundation.

Modes:

```text
local   -> execute approved commands on local machine with guardrails
dry-run -> return the planned command without running it
docker  -> execute in a Docker container with mounted workspace
```

Recommended config:

```json
{
  "sandbox": {
    "mode": "docker",
    "image": "node:22-alpine",
    "network": "none",
    "timeoutMs": 30000,
    "allowedCommands": ["node", "npm", "pnpm", "git", "python3"],
    "denyPatterns": ["rm -rf", "git push", "npm publish", "curl | sh"]
  }
}
```

The sandbox runner is a safety foundation, not a full hostile multi-tenant isolation boundary yet.

# TunaFlowAI Deployment Guide

This guide is for running TunaFlowAI on a small or medium production server.

## Requirements

- Node.js 22 or newer.
- A non-root Linux user, for example `tunaflow`.
- An HTTPS reverse proxy such as Nginx or Caddy.
- Secrets stored in environment variables or a server secret manager, never in Git.

## Directory layout

```text
/opt/tunaflow/app       # application source
/opt/tunaflow/config    # production config
/var/lib/tunaflow       # .tunaflow data, audit, state
/var/log/tunaflow       # service logs
```

## Minimal production config

```json
{
  "runtime": {
    "workspace": "/var/lib/tunaflow",
    "dataDir": ".tunaflow"
  },
  "server": {
    "host": "127.0.0.1",
    "port": 8787,
    "apiTokenEnv": "TUNAFLOW_API_TOKEN"
  },
  "auth": {
    "enabled": true,
    "passwordEnv": "TUNAFLOW_DASHBOARD_PASSWORD",
    "sessionSecretEnv": "TUNAFLOW_SESSION_SECRET"
  }
}
```

## Example systemd service

```ini
[Unit]
Description=TunaFlowAI
After=network-online.target

[Service]
Type=simple
User=tunaflow
WorkingDirectory=/opt/tunaflow/app
Environment=TUNAFLOW_CONFIG=/opt/tunaflow/config/tunaflow.config.json
EnvironmentFile=/opt/tunaflow/config/tunaflow.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/tunaflow /var/log/tunaflow

[Install]
WantedBy=multi-user.target
```

## Reverse proxy

- Terminate TLS at the proxy.
- Limit request body size.
- Add basic rate limiting for public endpoints.
- Never expose the dashboard without authentication.

## Backup and audit

Back up these files daily:

- production config;
- `.tunaflow/audit.jsonl`;
- `.tunaflow/state.json`;
- `.tunaflow/identity.json`;
- skill and plugin trust registries.

Verify the audit chain:

```bash
npm run check
node src/cli.js audit verify
```

## Rollback

1. Stop the service.
2. Check out the previous tag or commit.
3. Restore config if the schema changed.
4. Run the smoke test.
5. Start the service again.

## Security notes

- Do not run the service as root.
- Do not enable destructive tools without approval.
- Use a command allowlist.
- Payment, broker, public posting, and cloud upload integrations must remain explicitly approval-gated.

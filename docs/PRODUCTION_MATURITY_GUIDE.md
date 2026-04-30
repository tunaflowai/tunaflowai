# TunaFlowAI Production Maturity Guide

This document summarizes the product-maturity work that moves TunaFlowAI from a local demo toward a real operational product. The guiding principle is simple: every risky integration must be explicit, auditable, and safe by default.

## 1. Full Playwright browser driver

`src/browser/playwright-driver.js` provides an optional Playwright-based browser driver for production browser automation.

Capabilities:

- launch Chromium, Firefox, or WebKit through Playwright;
- fetch page title and body text;
- perform basic actions such as `click`, `fill`, `type`, `press`, and screenshot;
- support `storageState` for controlled logged-in sessions;
- write audit events for browser fetches and actions.

Optional setup:

```bash
npm install playwright
npx playwright install chromium
```

Use this only on trusted machines. Clicks, typing, form submissions, and transactions should still go through approval policy.

## 2. Production-grade XLSX/PDF parser

`src/parsers/document-parser.js` adds `ProductionDocumentParser` for document parsing.

Supported formats:

- `.txt`, `.md`, `.csv`, `.json`, `.log` without extra dependencies;
- `.xlsx` and `.xls` through optional `xlsx`;
- `.pdf` through optional `pdf-parse`.

Optional setup:

```bash
npm install xlsx pdf-parse
```

For untrusted documents, run parsing in a sandbox or container and enforce file-size limits.

## 3. Discord Gateway WebSocket mode

The Discord adapter now supports optional Gateway WebSocket mode for real-time bot messages.

Production checklist:

- read the bot token from `DISCORD_BOT_TOKEN`;
- keep intents minimal;
- use heartbeat handling and reconnect strategy;
- normalize inbound messages to internal `channel.message` events;
- send outbound messages through the Discord REST API.

Install optional dependency when enabling Gateway mode:

```bash
npm install ws
```

## 4. Slack Socket Mode

The Slack adapter now supports optional Socket Mode when a public webhook endpoint is not desired.

Production checklist:

- use `SLACK_APP_TOKEN` for Socket Mode;
- use `SLACK_BOT_TOKEN` for `chat.postMessage`;
- acknowledge envelopes quickly before long model work;
- normalize inbound messages to `channel.message` events.

Install optional dependency when enabling Socket Mode:

```bash
npm install ws
```

## 5. WhatsApp Cloud production guide

For WhatsApp Cloud production:

- use `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, and `WHATSAPP_APP_SECRET`;
- verify `x-hub-signature-256`;
- separate development and production numbers;
- do not send business templates without explicit approval;
- store outbound audit records without over-retaining sensitive message content;
- respect WhatsApp rate limits and the 24-hour customer service window.

## 6. Multi-user dashboard roles

Planned dashboard roles:

- `owner`: full access including config and high-risk approval;
- `admin`: manage channels, models, skills, and medium-risk approval;
- `operator`: run daily tasks and view status;
- `viewer`: read-only dashboard and audit summaries.

Suggested implementation path:

1. Add a local user store with hashed passwords.
2. Add cookie/session role claims.
3. Add authorization middleware per endpoint.
4. Audit every login and role change.
5. Add OIDC/SSO for enterprise deployments.

## 7. Remote audit backend

`src/core/remote-audit-backend.js` adds an optional remote audit mirror. The local audit log remains the source of truth; the remote backend is used for append-only mirroring.

Example config:

```json
{
  "audit": {
    "remote": {
      "enabled": true,
      "endpointEnv": "TUNAFLOW_AUDIT_ENDPOINT",
      "tokenEnv": "TUNAFLOW_AUDIT_TOKEN",
      "failClosed": false
    }
  }
}
```

Use an internal HTTPS endpoint, restrict source IPs, and preserve the hash chain for verification.

## 8. Plugin marketplace index

`src/plugins/marketplace-index.js` loads local and remote plugin marketplace indexes.

Example index:

```json
{
  "version": 1,
  "plugins": [
    {
      "name": "example-plugin",
      "description": "Example plugin",
      "version": "0.1.0",
      "url": "https://example.com/plugin.zip",
      "sha256": "...",
      "tags": ["utility"]
    }
  ]
}
```

Marketplace entries must never auto-install without signature verification and user approval.

## 9. Signed plugin distribution

`src/plugins/signed-distribution.js` provides manifest and HMAC signature utilities for plugin distribution.

Safe flow:

1. Create a manifest with file paths and hashes.
2. Sign the manifest with a signing secret.
3. Publish the plugin and manifest together.
4. Verify file hashes and signature before installation.
5. Record trust decisions in the skill or plugin trust registry.

For a public ecosystem, HMAC can later be upgraded to Ed25519 public/private key signing.

## 10. Full deployment guide

See `docs/DEPLOYMENT_GUIDE.md` for production deployment, systemd, reverse proxy, backup, audit, and rollback guidance.

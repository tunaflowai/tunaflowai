# Localhost Dashboard

TunaFlowAI v0.4 includes a dependency-free localhost dashboard served by the gateway.

Start it:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:8787/dashboard
```

The dashboard is designed for local development and early product validation.

## Panels

The dashboard shows:

```text
- gateway status
- active persona
- persona switcher
- pending approvals
- model health and attempts
- job skills
- chat/event sender
- compact state
- recent runs
- recent events
- audit log
```

## API token

If `TUNAFLOW_API_TOKEN` is configured, unsafe endpoints require:

```text
Authorization: Bearer <token>
```

Paste the token into the dashboard token field. It is stored in browser `localStorage` for localhost convenience.

## Endpoints used

```text
GET  /health
GET  /overview
GET  /state
GET  /runs
GET  /events
GET  /audit
GET  /models
GET  /skills
GET  /skill-jobs
GET  /personas
GET  /personas/active
GET  /personas/current
GET  /approvals?status=pending
POST /chat
POST /events
POST /personas/:name/activate
POST /personas/:id/skills/acquire
POST /personas/:id/skills/release
POST /skills/acquire
POST /approvals/:id/approve
POST /approvals/:id/reject
```

## Production note

This dashboard is not a production multi-user UI yet. Before exposing it beyond localhost, add:

```text
- real authentication
- CSRF protection
- role-based permissions
- HTTPS
- persistent user sessions
- audit viewer pagination
- policy-aware form controls
```

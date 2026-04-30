# Agent Identity

TunaFlowAI supports user-defined identity so the agent can have a name and personality independent from its active persona.

## Commands

```bash
node src/cli.js identity show
node src/cli.js identity name Anna
node src/cli.js identity set personality.tone="warm, precise, proactive"
node src/cli.js identity reset
```

## API

```text
GET  /identity
POST /identity/name
POST /identity/personality
POST /identity/reset
```

## Rules

- Identity affects communication style and prompt initialization.
- Identity does not grant tool permissions.
- Identity cannot bypass approval policy.
- Identity cannot access secrets.
- Identity changes are recorded in the audit log.

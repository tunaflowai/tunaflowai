# TunaFlowAI v0.4 Persona + Dashboard Pack

This pack upgrades the provider/skills/channels foundation with product-level runtime behavior:

```text
1. Persona-based initialization and runtime switching
2. Persona-specific acquired job skills
3. Localhost dashboard GUI
4. Job skill discovery endpoints
5. Cleaner v0.4 documentation and examples
```

## Added

### Personas

- `src/personas/persona-manager.js`
- bundled personas in `src/personas/bundled/*/PERSONA.md`
- persona prompt initialization
- active persona persisted in `.tunaflow/persona-state.json`
- persona skill acquisition and release

CLI:

```bash
node src/cli.js personas
node src/cli.js persona active
node src/cli.js persona set anna
node src/cli.js persona acquire file-programmer software-engineer
node src/cli.js persona release file-programmer software-engineer
```

API:

```text
GET  /personas
GET  /personas/active
POST /personas/:name/activate
POST /personas/switch
```

### Job skills

- acquired skills are copied into `.tunaflow/skills/acquired`
- skill jobs are exposed through `GET /skill-jobs`
- `/skills/install` is an alias for `/skills/acquire`
- bundled job skills include investigation, coding, system operation, and proactive workspace monitoring examples

CLI:

```bash
node src/cli.js skills jobs
node src/cli.js skills create <name>
node src/cli.js skills acquire <path-or-loaded-skill-name>
node src/cli.js skills acquired
```

API:

```text
GET  /skills
GET  /skills/acquired
GET  /skill-jobs
POST /skills/acquire
POST /skills/install
POST /skills/reload
```

### Dashboard

- `src/dashboard/dashboard.js`
- localhost dashboard at `http://127.0.0.1:8787/dashboard`
- panels for personas, job skills, approvals, model health, state, runs, events, audit logs, chat, and event sending

CLI:

```bash
node src/cli.js dashboard
```

API:

```text
GET /
GET /dashboard
GET /overview
```

## Validation

Validated with:

```bash
npm --silent test
node examples/demo.js
node src/cli.js check
```

## Recommended branch name

```bash
git checkout -b v0.4-personas-skills-dashboard
```

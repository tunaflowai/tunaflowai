# Persona-Based Initialization

TunaFlowAI v0.4 introduces persona-based initialization. A persona is the runtime identity that shapes how TunaFlowAI thinks, communicates, selects skills, and chooses model chains.

A persona is not a permission system. It cannot grant access to tools, secrets, files, commands, channels, or external APIs. The permission engine remains the source of truth.

## Built-in personas

Bundled personas live in:

```text
src/personas/bundled/<persona>/PERSONA.md
```

Current bundled personas:

```text
operator
anna
software-engineer
code-reviewer
system-operator
customer-support
research-analyst
product-manager
```

## Commands

List personas:

```bash
node src/cli.js personas
```

Show active persona:

```bash
node src/cli.js persona active
```

Switch persona:

```bash
node src/cli.js persona set anna
node src/cli.js persona set software-engineer
node src/cli.js persona set customer-support
```

## HTTP API

```text
GET  /personas
GET  /personas/active
POST /personas/:name/activate
POST /personas/switch
```

Example:

```bash
curl -s -X POST http://127.0.0.1:8787/personas/anna/activate \
  -H 'content-type: application/json' \
  -d '{"source":"curl"}'
```

## Persona format

A persona is a `PERSONA.md` file with frontmatter and instructions.

```md
---
name: software-engineer
title: Software Engineer
version: 0.4.0
description: Engineering persona for coding, debugging, tests, and implementation plans.
role: senior software engineer
defaultSkills:
  - terminal-debugger
  - code-reviewer
preferredChains:
  - default=strong
  - terminal.output=strong
  - file.changed=cheap
riskPosture: careful
autonomy: approval-first
communicationStyle: precise, technical, test-driven
---
You are a senior software engineer persona inside TunaFlowAI.

Prioritize correctness, small diffs, tests, and verification.
```

## Persona skill acquisition

A persona can acquire a loaded job skill without changing global skill availability. This makes it possible to turn one runtime into different workers over time.

```bash
node src/cli.js persona acquire file-programmer software-engineer
node src/cli.js persona acquire workspace-sentinel operator
node src/cli.js persona release file-programmer software-engineer
```

Acquired skills are stored in `.tunaflow/persona-state.json` and appear as `acquiredSkills` and `effectiveSkills` in `/personas` and `/personas/active`.

## What personas affect

Personas affect:

```text
- system prompt initialization
- selected default job skills
- preferred model chain
- communication style
- risk posture hints
- autonomy hints
```

Personas do not affect:

```text
- actual tool permissions
- workspace path restrictions
- approval requirements
- command allowlists or denylists
- API token security
- audit log integrity
```

## Loading precedence

Configured in `config/tunaflow.config.example.json`:

```json
{
  "personas": {
    "enabled": true,
    "default": "operator",
    "bundled": true,
    "allowWorkspacePersonas": false,
    "allowUserPersonas": false,
    "paths": []
  }
}
```

Recommended trust model:

```text
1. bundled personas: safe defaults
2. workspace personas: project-specific, opt-in
3. user personas: personal, opt-in
4. custom paths: explicit advanced config
```

## Security rule

The active persona is a behavioral layer only. It must never override:

```text
- permission engine
- tool risk levels
- channel allowlists
- workspace boundaries
- audit logging
```

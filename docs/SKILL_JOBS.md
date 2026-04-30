# Job Skills

TunaFlowAI skills are job procedures. They tell the agent how to do a kind of work without granting new capabilities.

Tool gives capability. Skill gives procedure.

## Why job skills exist

A persona decides the working identity. A job skill provides a repeatable workflow.

Examples:

```text
terminal-debugger
code-reviewer
daily-reporter
customer-support-drafter
browser-researcher
receipt-auditor
pos-menu-editor
invoice-checker
```

## Skill format

A skill is a folder containing `SKILL.md`:

```text
skills/receipt-auditor/SKILL.md
```

Example:

```md
---
name: receipt-auditor
version: 0.1.0
description: Audit receipt and POS related events.
triggers:
  - receipt
  - pos
tools:
  - read_file
risk: low
maxContextChars: 2500
---
# Receipt Auditor

Use this skill when receipt, checkout, or POS events appear.

Workflow:
1. Summarize the event.
2. Read only relevant files.
3. Identify likely issues.
4. Suggest a safe fix.
5. Ask approval before edits or commands.
```

## Commands

List job skills:

```bash
node src/cli.js skills
```

Create a starter job skill:

```bash
node src/cli.js skills create receipt-auditor
```

Acquire a local skill pack:

```bash
node src/cli.js skills acquire ./external-skills/receipt-auditor
```

List acquired skills:

```bash
node src/cli.js skills acquired
```

## HTTP API

```text
GET  /skills
GET  /skills/acquired
GET  /skill-jobs
POST /skills/acquire
POST /skills/reload
POST /personas/:id/skills/acquire
POST /personas/:id/skills/release
```

Acquire example:

```bash
curl -s -X POST http://127.0.0.1:8787/skills/acquire \
  -H 'content-type: application/json' \
  -d '{"source":"./external-skills/receipt-auditor"}'
```

## Persona-specific skill jobs

You can enable a reviewed skill for a specific persona without making it a global default.

CLI:

```bash
node src/cli.js persona acquire receipt-auditor anna
node src/cli.js persona release receipt-auditor anna
```

HTTP API:

```bash
curl -s -X POST http://127.0.0.1:8787/personas/anna/skills/acquire \
  -H 'content-type: application/json' \
  -d '{"skillName":"receipt-auditor"}'
```

Persona-specific acquisition changes skill selection, but it does not grant extra tool permissions.

## Acquisition model

In v0.4, acquisition is local-first:

```text
source folder/file -> copy into .tunaflow/skills/acquired -> reload skill index -> audit event
```

Remote acquisition is intentionally disabled in this dependency-free alpha. Download and review third-party skills locally before acquiring them. `/skills/install` is an alias for `/skills/acquire` so future UI and marketplace flows can use the same mental model without enabling remote installs yet.

## Security defaults

Skills cannot:

```text
- grant tool permissions
- bypass approval
- access secrets
- run install scripts
- change model config
- change channel config
```

Skills can:

```text
- describe workflow steps
- declare expected tools
- declare triggers
- limit prompt size via maxContextChars
- help the selector choose relevant instructions
```

## Recommended third-party skill review

Before acquiring a third-party skill, inspect `SKILL.md` for:

```text
- hidden instructions that try to bypass policy
- requests to reveal secrets
- commands that install or run unknown code
- prompts that ask the model to ignore safety rules
- overly broad tool requirements
```

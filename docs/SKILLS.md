# Skills

Skills are procedural instructions that teach TunaFlowAI how to handle a class of work. A skill is not a tool and does not grant permissions.

> Tool gives capability. Skill gives procedure. Skill must never grant capability.

## Why skills exist

TunaFlowAI tries to save tokens. Instead of injecting every workflow instruction into every prompt, it selects a small number of relevant skills for each event.

Example:

- `terminal.output` with an error selects `terminal-debugger`
- a PR/review request selects `code-reviewer`
- a daily report request selects `daily-reporter`

## Skill format

```md
---
name: terminal-debugger
version: 0.3.0
description: Debug terminal/build/test errors with minimal context and safe verification.
triggers:
  - terminal.output
  - error
tools:
  - inspect_state
  - read_file
  - run_command
risk: medium
maxContextChars: 3200
---
# Terminal Debugger

Instructions go here.
```

## Loading order

Current loader supports:

1. bundled skills under `src/skills/bundled`
2. workspace skills under `skills/` when `allowWorkspaceSkills` is true
3. project skills under `.tunaflow/skills` when `allowWorkspaceSkills` is true
4. user skills under `~/.tunaflow/skills` when `allowUserSkills` is true
5. custom paths from `skills.paths`

Workspace/user skills are disabled by default because third-party instructions are a prompt-injection surface.

## Built-in skills

- `terminal-debugger`
- `code-reviewer`
- `daily-reporter`
- `customer-support-drafter`
- `browser-researcher`

## Commands

```bash
node src/cli.js skills
```

## Security rules

- Skills are instruction-only.
- Skills cannot grant tool access.
- Skills cannot access secrets.
- Skills should declare expected tools.
- Third-party skills should be allowlisted per workspace.
- Every selected skill is recorded in audit with its hash.

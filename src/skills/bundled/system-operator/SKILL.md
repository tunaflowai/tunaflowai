---
name: system-operator
version: 0.4.0
description: Run supervised build, test, and local maintenance commands with strict approval gates.
triggers:
  - terminal.output
  - build
  - test
  - install
  - command
  - shell
tools:
  - inspect_state
  - run_command
  - send_reply
jobs:
  - operator
personas:
  - system-operator
  - operator
  - software-engineer
risk: high
maxContextChars: 2800
---
# System Operator

Use this job skill when a task requires shell commands, tests, builds, local scripts, or environment checks.

Procedure:
1. Explain why a command is needed.
2. Prefer read-only or narrow commands first.
3. Request approval for every high-risk command.
4. Never run publish, push, reset, delete, credential, payment, or secret-revealing commands.
5. Summarize stdout/stderr and whether the command verified the task.

---
name: terminal-debugger
version: 0.3.0
description: Debug terminal/build/test errors with minimal context and safe verification.
triggers:
  - terminal.output
  - build.failed
  - test.failed
  - error
tools:
  - inspect_state
  - list_files
  - read_file
  - edit_file
  - run_command
  - send_reply
risk: medium
maxContextChars: 3200
---
# Terminal Debugger

Use this skill when terminal output contains errors, failed tests, exceptions, tracebacks, missing modules, or build failures.

Procedure:
1. Summarize the error in one sentence.
2. Identify the smallest likely set of files to inspect.
3. Prefer `inspect_state`, `list_files`, and `read_file` before edits.
4. Do not run broad commands when a narrower verification command exists.
5. `edit_file` and `run_command` require approval unless policy explicitly allows them.
6. After a fix, verify with the narrowest relevant command.
7. Report what changed, how it was verified, and what still needs human review.

Token rule: never ask for full repository context first. Inspect only what the error points to.

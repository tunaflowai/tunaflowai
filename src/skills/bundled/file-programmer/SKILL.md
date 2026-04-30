---
name: file-programmer
version: 0.4.0
description: Make small, safe code and text file changes after investigation and approval.
triggers:
  - edit
  - write
  - implement
  - fix
  - code
  - file.changed
tools:
  - inspect_state
  - list_files
  - read_file
  - write_file
  - edit_file
  - append_file
  - send_reply
jobs:
  - programmer
personas:
  - software-engineer
  - anna
risk: medium
maxContextChars: 3200
---
# File Programmer

Use this job skill when the user asks TunaFlowAI to implement, edit, patch, or create files.

Procedure:
1. Inspect state and read only the smallest relevant files.
2. Prepare a minimal change plan.
3. Use file editing tools only after approval unless policy allows auto-approval.
4. Keep changes focused; do not rewrite unrelated files.
5. Report exact files changed and what still needs verification.

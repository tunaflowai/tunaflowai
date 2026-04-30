---
name: code-reviewer
version: 0.3.0
description: Review code changes for correctness, safety, and maintainability.
triggers:
  - review
  - pull request
  - diff
  - git
tools:
  - list_files
  - read_file
  - run_command
  - send_reply
risk: low
maxContextChars: 2800
---
# Code Reviewer

Use this skill when asked to review a patch, pull request, or local code change.

Procedure:
1. Identify changed files first.
2. Read only relevant files or focused snippets.
3. Look for correctness bugs, security risks, API breakage, and missing tests.
4. Separate blocking issues from suggestions.
5. Do not edit files unless explicitly asked.
6. If verification is needed, request approval before running commands.

Output should be concise and action-oriented.

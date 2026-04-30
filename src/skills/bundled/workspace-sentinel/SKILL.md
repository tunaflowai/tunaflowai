---
name: workspace-sentinel
version: 0.4.0
description: Proactively monitor terminal and file events, detect important signals, and suggest safe next actions.
triggers:
  - terminal.output
  - file.changed
  - agent.result_failed
  - error
  - failed
tools:
  - inspect_state
  - send_reply
jobs:
  - monitor
personas:
  - anna
  - operator
risk: low
maxContextChars: 2400
---
# Workspace Sentinel

Use this job skill when TunaFlowAI is acting as a proactive monitor.

Procedure:
1. Detect meaningful changes and ignore noise.
2. Explain what changed or failed in one concise paragraph.
3. Suggest one safe next action.
4. Do not edit files or run commands unless the user approves a specific follow-up.

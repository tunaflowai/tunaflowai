---
name: daily-reporter
version: 0.3.0
description: Turn work events and runs into a concise daily progress report.
triggers:
  - daily
  - report
  - summary
  - standup
tools:
  - inspect_state
  - send_reply
risk: low
maxContextChars: 2200
---
# Daily Reporter

Use this skill when the user asks for a progress report, standup update, or daily summary.

Procedure:
1. Use compact state and recent runs, not raw history.
2. Group by completed work, blocked work, pending approvals, and next actions.
3. Mention uncertainty when evidence is incomplete.
4. Keep it short enough to paste into chat.

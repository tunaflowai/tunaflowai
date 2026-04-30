---
name: browser-researcher
version: 0.3.0
description: Reason over browser/page events and plan safe web or browser follow-up actions.
triggers:
  - browser.page_changed
  - browser
  - web
  - research
  - url
tools:
  - inspect_state
  - send_reply
risk: low
maxContextChars: 2500
---
# Browser Researcher

Use this skill for browser events, webpage observations, or research tasks.

Procedure:
1. Treat page title and URL as signals, not proof.
2. Ask for a browser/page inspection tool if page content is required but unavailable.
3. Do not submit forms, click destructive buttons, or authenticate without approval.
4. Summarize what is known and what needs verification.

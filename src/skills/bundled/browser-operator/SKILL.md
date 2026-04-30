---
name: browser-operator
version: 0.1.0
description: Fetch web pages and perform browser-like HTTP operations with approval gates for mutations.
triggers:
  - browser.page_changed
  - user.message
tools:
  - browser_fetch
  - browser_http_request
  - send_reply
personas:
  - research-analyst
  - operator
jobs:
  - browser-operator
risk: medium
maxContextChars: 2800
---
# Browser Operator

Use this skill when web pages, dashboards, or browser-like operations are needed.

Workflow:
1. Use browser_fetch for read-only inspection.
2. Summarize the page and relevant links.
3. Treat POST/PUT/PATCH/DELETE or form submissions as risky mutations requiring approval.
4. Never submit credentials or payments without explicit user approval and policy support.

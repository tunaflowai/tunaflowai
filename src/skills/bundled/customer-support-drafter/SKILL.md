---
name: customer-support-drafter
version: 0.3.0
description: Draft careful customer/client replies without sending them unless approved.
triggers:
  - customer
  - support
  - client
  - email
  - reply
tools:
  - inspect_state
  - send_reply
risk: medium
maxContextChars: 2800
---
# Customer Support Drafter

Use this skill for customer support, client replies, or external communication.

Procedure:
1. Draft before sending.
2. Do not promise facts that are not present in context.
3. Preserve a helpful, calm, and professional tone.
4. For external messages, ask approval before sending to a real channel unless the user explicitly configured auto-send.
5. Include a short rationale when the answer may affect business, refunds, legal, payments, or account access.

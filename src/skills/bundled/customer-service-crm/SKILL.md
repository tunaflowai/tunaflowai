---
name: customer-service-crm
version: 0.1.0
description: Draft customer support replies, query FAQ/order status, and create support tickets when escalation is needed.
triggers:
  - channel.message
  - customer.complaint
  - webhook.order
  - user.message
tools:
  - query_faq_database
  - check_order_status
  - create_support_ticket
  - send_reply
personas:
  - customer-support
  - operator
jobs:
  - customer-service-crm
risk: medium
maxContextChars: 3200
---
# Customer Service & CRM

Use this skill for customer questions, complaints, FAQ lookup, order status checks, and escalation tickets.

Workflow:
1. Classify the customer issue and urgency.
2. Query FAQ/order status if data sources are configured.
3. Draft a polite reply with clear next steps.
4. Create a support ticket for complex or risky issues; ask approval before committing escalations.

---
name: ecommerce-marketplace-manager
version: 0.2.0
description: Manages marketplace price checks, stock sync drafts, product descriptions, and refund review workflows.
triggers:
- marketplace-api-watcher
- order-webhook
- marketplace.order
- user.message
tools:
- scrape_competitor_prices
- auto_update_stock
- generate_product_description
- process_refund_request
personas:
- operator
- research-analyst
jobs:
- ecommerce-manager
- marketplace-admin
risk: high
maxContextChars: 3200
---
# E-commerce and Marketplace Manager

Use for online-store operations. Live stock changes, refunds, and marketplace API writes require approval.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.

---
name: franchise-branch-supervisor
version: 0.2.0
description: Detects suspicious POS voids, aggregates branch data, and schedules kitchen maintenance from usage counts.
triggers:
- daily-closing-webhook
- store.close
- user.message
tools:
- detect_fraudulent_voids
- aggregate_multi_store_data
- schedule_kitchen_maintenance
personas:
- operator
- research-analyst
jobs:
- franchise-supervisor
- multi-branch-operations
risk: medium
maxContextChars: 3200
---
# Franchise and Multi-Branch Supervisor

Use for branch operations, daily closing, void/fraud signals, and maintenance scheduling. Treat fraud as a signal needing human review.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.

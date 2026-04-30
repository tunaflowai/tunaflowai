---
name: smart-home-butler
version: 0.2.0
description: Manages household routines around constraints and prepares approval-gated grocery reorder requests.
triggers:
- time-based-cron
- motion-sensor-watcher
- home.routine
- user.message
tools:
- manage_household_schedule
- auto_order_groceries
personas:
- operator
- research-analyst
jobs:
- smart-home-butler
- home-automation
risk: high
maxContextChars: 3200
---
# Smart Home Butler

Use for smart-home scheduling and grocery reorder drafts. Live device or purchase actions require approval.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.

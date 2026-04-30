---
name: supply-chain-logistics-coordinator
version: 0.2.0
description: Tracks deliveries, generates purchase orders, and calculates dynamic COGS/HPP from ingredient costs.
triggers:
- inventory-threshold-watcher
- inventory.low
- user.message
tools:
- track_delivery_status
- generate_purchase_order
- calculate_dynamic_cost
personas:
- operator
- research-analyst
jobs:
- supply-chain
- logistics-coordinator
risk: medium
maxContextChars: 3200
---
# Supply Chain and Logistics Coordinator

Use for vendor, inventory, PO, and delivery workflows. Live order placement requires connector approval.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.

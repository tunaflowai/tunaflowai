---
name: fnb-manager
version: 0.1.0
description: Help restaurants and F&B teams monitor inventory, daily sales, restock warnings, and POS exports.
triggers:
  - schedule.daily_close
  - order.created
  - inventory.low
  - user.message
tools:
  - check_inventory_level
  - send_restock_warning
  - summarize_daily_sales
  - read_spreadsheet
  - update_spreadsheet
  - send_reply
personas:
  - operator
  - product-manager
jobs:
  - fnb-manager
  - restaurant-operations
risk: medium
maxContextChars: 3200
---
# F&B Manager

Use this skill for restaurant operations, daily closing reports, inventory checks, and sales summaries.

Workflow:
1. Identify the POS/inventory export file or incoming order event.
2. Summarize total sales, top menu items, low-stock ingredients, and restock risks.
3. Draft restock warnings or operational notes.
4. Ask approval before mutating spreadsheets, creating files, or sending external alerts.

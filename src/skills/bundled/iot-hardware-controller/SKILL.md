---
name: iot-hardware-controller
version: 0.2.0
description: Controls POS-adjacent devices such as thermal printers, paper checks, smart lights, and playlists through adapters.
triggers:
- local-network-watcher
- pos-hardware-watcher
- transaction.completed
- user.message
tools:
- print_receipt_to_thermal
- check_printer_paper
- control_smart_environment
personas:
- operator
- research-analyst
jobs:
- iot-controller
- pos-hardware
risk: high
maxContextChars: 3200
---
# Smart Hardware and IoT Controller

Use for local hardware and smart environment tasks. Live hardware commands require a configured local adapter and approval.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.

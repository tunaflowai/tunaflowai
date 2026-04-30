---
name: devops-server-guard
version: 0.1.0
description: Monitor service health, ping endpoints, propose restarts, and run backups with approval gates.
triggers:
  - server.down
  - server.unhealthy
  - schedule.backup
  - terminal.output
  - user.message
tools:
  - ping_service
  - restart_server
  - run_database_backup
  - run_command
  - send_reply
personas:
  - system-operator
  - operator
jobs:
  - devops-server-guard
  - system-administrator
risk: high
maxContextChars: 3200
---
# DevOps Server Guard

Use this skill when services are down, health checks fail, backups are scheduled, or server operations are requested.

Workflow:
1. Confirm the service and observed failure.
2. Use low-risk pings/checks before proposing mutations.
3. For restart_server, run_database_backup, or run_command, request explicit approval.
4. Verify the service after the approved action.
5. Report evidence, not guesses.

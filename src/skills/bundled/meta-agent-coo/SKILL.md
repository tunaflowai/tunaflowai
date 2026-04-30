---
name: meta-agent-coo
version: 0.2.0
description: Delegates large projects into sub-agent workstreams and prepares high-risk local worker spawn commands.
triggers:
- task-queue-overload-watcher
- task.queue_overload
- user.message
tools:
- spawn_sub_agent
- delegate_task
personas:
- operator
- research-analyst
jobs:
- meta-agent
- coo
risk: high
maxContextChars: 3200
---
# Meta-Agent COO

Use when workload is too large for one run. Spawning workers requires local command approval and port/resource planning.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.

---
name: database-sync-engineer
version: 0.2.0
description: Prepares offline-to-cloud sync batches and resolves conflicting edits by timestamp and source priority.
triggers:
- offline-state-watcher
- sync.required
- user.message
tools:
- sync_offline_to_cloud
- resolve_data_conflict
personas:
- operator
- research-analyst
jobs:
- database-sync-engineer
- data-sync
risk: high
maxContextChars: 3200
---
# Database Sync Engineer

Use for Google Sheets or local/cloud sync. Live cloud writes require an adapter, ordering guarantees, and approval.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.

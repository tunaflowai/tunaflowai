---
name: project-manager-scrum
version: 0.1.0
description: Track overdue tasks, ping team members, and generate sprint or standup reports.
triggers:
  - trello-webhook
  - jira-watcher
  - project
  - sprint
  - scrum
  - deadline
  - overdue
  - user.message
tools:
  - check_overdue_tasks
  - ping_team_member
  - generate_sprint_report
  - send_reply
personas:
  - product-manager
  - operator
jobs:
  - project-manager
  - scrum-master
  - manajer-proyek
tags:
  - project
  - sprint
  - jira
  - trello
risk: medium
maxContextChars: 3200
---
# Project Manager / Scrum Master

Use this skill for project status, overdue tasks, standups, and sprint summaries.

Workflow:
1. Check task status and deadline data before contacting anyone.
2. Separate done, overdue, blocked, and open work.
3. Draft pings with a helpful tone: ask for blockers, do not blame.
4. Sending team messages requires approval unless an approved channel policy allows it.
5. Generate a concise sprint report with risks and next actions.

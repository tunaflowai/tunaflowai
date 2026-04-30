---
name: virtual-secretary
version: 0.1.0
description: Manage schedules, check calendar conflicts, prepare meetings, and draft travel-ticket requests.
triggers:
  - calendar-api-watcher
  - schedule
  - meeting
  - jadwal
  - ticket
  - travel
  - user.message
tools:
  - check_calendar_conflict
  - schedule_meeting
  - book_ticket_api
  - send_notification
  - send_reply
personas:
  - operator
  - anna
jobs:
  - secretary
  - personal-assistant
  - asisten-pribadi
tags:
  - calendar
  - meeting
  - scheduling
risk: high
maxContextChars: 3000
---
# Virtual Secretary / Personal Assistant

Use this skill for scheduling, reminders, and travel preparation.

Workflow:
1. Check conflicts before proposing or scheduling a meeting.
2. Confirm timezone, attendees, date, and duration.
3. Scheduling a real meeting requires approval unless the user has explicitly configured auto-schedule.
4. Booking tickets is high risk. Prepare the request first; do not purchase without explicit approval and a configured travel adapter.
5. Report whether the action was a dry run, local record, or real external update.

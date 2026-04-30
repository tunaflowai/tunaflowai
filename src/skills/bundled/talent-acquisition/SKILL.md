---
name: talent-acquisition
version: 0.1.0
description: Screen resumes, score candidates against criteria, and draft interview or rejection messages.
triggers:
  - email-inbox-watcher
  - email.received
  - job application
  - resume
  - cv
  - candidate
  - interview
  - user.message
tools:
  - extract_resume_text
  - score_candidate
  - send_notification
  - send_interview_invite
  - send_rejection_email
  - send_reply
personas:
  - operator
  - back-office-admin
jobs:
  - hrd
  - recruiter
  - talent-acquisition
tags:
  - hr
  - resume
  - recruitment
risk: medium
maxContextChars: 3200
---
# HRD & Talent Acquisition

Use this skill when a job application arrives or the user asks to screen candidates.

Workflow:
1. Extract resume text from the uploaded/linked file. If the file is DOCX or scanned PDF, explain that a trusted local parser/OCR command is needed.
2. Score the candidate against required and nice-to-have criteria using transparent evidence.
3. Notify the user about strong candidates before sending external messages.
4. Draft interview invites or rejection emails politely. Sending to real channels requires approval.
5. Keep candidate data private and avoid unnecessary retention.

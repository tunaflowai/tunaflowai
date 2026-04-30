---
name: back-office-admin
version: 0.1.0
description: Handle invoice extraction, spreadsheet updates, email sorting, and repetitive data entry workflows.
triggers:
  - email.received
  - file.created
  - folder.downloaded
  - user.message
tools:
  - extract_invoice_pdf
  - update_spreadsheet
  - sort_important_emails
  - read_spreadsheet
  - read_file
  - send_reply
personas:
  - operator
  - customer-support
jobs:
  - back-office-admin
  - data-entry
risk: medium
maxContextChars: 3000
---
# Back-Office Admin

Use this skill for invoice intake, data entry, and important-email triage.

Workflow:
1. Extract structured fields from the smallest relevant document/email.
2. Validate dates, amounts, and names before updating any spreadsheet.
3. Ask approval before writing files or updating spreadsheets.
4. Provide a short exception list for uncertain rows.

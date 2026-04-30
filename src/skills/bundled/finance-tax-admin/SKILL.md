---
name: finance-tax-admin
version: 0.1.0
description: Read CSV/JSON financial exports, calculate VAT/PPN-style estimates, and generate simple financial reports or invoices.
triggers:
  - file.changed
  - user.message
tools:
  - read_spreadsheet
  - read_pdf_text
  - extract_invoice_pdf
  - calculate_tax_ppn
  - generate_financial_summary
  - generate_invoice
  - update_spreadsheet
  - send_reply
personas:
  - operator
  - product-manager
jobs:
  - finance-tax-admin
  - back-office-admin
risk: medium
maxContextChars: 3500
---
# Finance & Tax Admin

Use this skill for bookkeeping, invoice extraction, CSV/JSON sales summaries, and tax estimates.

Workflow:
1. Read only the requested financial file or a small sample first.
2. Normalize rows and compute totals deterministically.
3. Use calculate_tax_ppn for percentage tax estimates; clearly label them as estimates.
4. Generate reports/invoices only after approval when files will be written.
5. Never claim legal/tax certainty; recommend review by a qualified professional for official filings.

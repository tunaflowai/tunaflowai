---
name: data-analyst-reporter
version: 0.1.0
description: Clean CSV/Excel-like exports, find anomalies, and create lightweight charts/reports.
triggers:
  - folder-watcher
  - file.created
  - csv
  - excel
  - spreadsheet
  - anomaly
  - chart
  - user.message
tools:
  - read_spreadsheet
  - clean_csv_data
  - find_data_anomalies
  - generate_chart_image
  - send_reply
personas:
  - research-analyst
  - operator
jobs:
  - data-analyst
  - reporting-analyst
  - analis-data
tags:
  - csv
  - spreadsheet
  - chart
  - anomaly
risk: medium
maxContextChars: 3400
---
# Data Analyst & Reporter

Use this skill for messy CSV/TSV/JSON exports, anomaly detection, and charts.

Workflow:
1. Inspect the file shape and keep raw data local.
2. Clean empty or duplicate rows only after approval if a file will be written.
3. Detect numeric anomalies and explain the method used.
4. Generate SVG charts by default because they are lightweight and dependency-free.
5. Summarize findings, uncertain columns, and next analysis steps.

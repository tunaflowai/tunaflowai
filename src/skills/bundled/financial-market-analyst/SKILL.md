---
name: financial-market-analyst
version: 0.1.0
description: Monitor stocks, crypto, and market anomalies, then draft or send alerts through approved channels.
triggers:
  - market.price_spike
  - market.volume_spike
  - user.message
tools:
  - fetch_market_data
  - fetch_asset_price
  - generate_financial_summary
  - send_telegram_alert
  - send_reply
personas:
  - research-analyst
  - operator
jobs:
  - financial-market-analyst
risk: medium
maxContextChars: 3000
---
# Financial & Market Analyst

Use this skill when the user asks about stocks, crypto, asset monitoring, or market alerts.

Workflow:
1. Identify the asset, timeframe, and whether the user wants analysis or alerting.
2. Fetch the smallest useful market data.
3. Summarize price movement, volume, and anomalies without pretending to provide licensed financial advice.
4. If an alert must be sent, use send_telegram_alert only when policy/approval allows it.
5. Include uncertainty and source/provider in the final report.

---
name: algorithmic-trader
version: 0.2.0
description: Combines technical indicators, calculates dynamic lot size, and prepares critical broker order requests.
triggers:
- mt4-log-watcher
- tradingview-webhook
- market.signal
- user.message
tools:
- analyze_multiple_indicators
- execute_buy_sell_order
- calculate_dynamic_lot
personas:
- operator
- research-analyst
jobs:
- algorithmic-trader
- quant-system
risk: critical
maxContextChars: 3200
---
# Algorithmic Trader and Quant System

Use for trading analysis only unless a broker adapter and explicit approval are present. Never present outputs as financial advice.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.

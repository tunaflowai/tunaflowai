# Demo Guide

This guide shows the current MVP behavior.

## Run tests

```bash
npm test
```

## Run the fallback demo

```bash
npm run demo
```

The demo config intentionally lets the first mock model fail, then verifies that TunaFlow falls back to the next provider in the chain.

## Start the local gateway

```bash
npm run dev
```

Then send a chat event:

```bash
curl -s http://127.0.0.1:8787/chat \
  -H 'content-type: application/json' \
  -d '{"text":"Watch my workspace and keep model usage efficient"}'
```

Send a terminal error event:

```bash
curl -s http://127.0.0.1:8787/events \
  -H 'content-type: application/json' \
  -d '{"type":"terminal.output","priority":"high","text":"Error: cannot find variable plans"}'
```

Inspect runtime state:

```bash
curl -s http://127.0.0.1:8787/state
curl -s http://127.0.0.1:8787/models
curl -s http://127.0.0.1:8787/audit
```

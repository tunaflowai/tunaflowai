# TunaFlowAI Demo

Run the fallback demo:

```bash
npm run demo
```

Expected behavior:

1. The primary mock model fails intentionally.
2. The fallback mock model succeeds.
3. TunaFlowAI detects the terminal error event.
4. TunaFlowAI writes a safe `send_reply` action.
5. Audit logs are written to `.tunaflow-demo/audit.jsonl`.

Run the local gateway:

```bash
npm run dev
```

Send a chat event:

```bash
curl -s http://127.0.0.1:8787/chat \
  -H 'content-type: application/json' \
  -d '{"text":"Watch my workspace and keep model usage efficient"}'
```

List pending approvals:

```bash
tunaflow approvals pending
```

Verify audit logs:

```bash
tunaflow audit verify
```

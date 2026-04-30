# Channel Adapters

TunaFlowAI v0.3 introduces a channel adapter layer. Channels normalize inbound messages into `WorkEvent` objects and route `send_reply` back to the right destination.

## Current adapters

- `webhook` / `webchat`
- `telegram`
- `discord`
- `slack`
- `whatsappCloud`

The adapters are dependency-free and use `fetch`. They are intentionally minimal foundations, not full production bots yet.

## Inbound webhook

```bash
curl -s http://127.0.0.1:8787/channels/webhook/webhook \
  -H 'content-type: application/json' \
  -d '{"text":"hello from webhook","conversationId":"demo","senderId":"user-1"}'
```

## Outbound routing

`send_reply` now uses the current event channel when available:

```text
send_reply -> OutboundRouter -> ChannelRegistry -> adapter.send()
```

If no matching channel exists, the message is written to `.tunaflow/outbound/replies.jsonl`.

## Example config

```json
{
  "channels": {
    "webhook": { "enabled": true },
    "telegram": { "enabled": false, "tokenEnv": "TELEGRAM_BOT_TOKEN" },
    "discord": { "enabled": false, "tokenEnv": "DISCORD_BOT_TOKEN" },
    "slack": { "enabled": false, "botTokenEnv": "SLACK_BOT_TOKEN" },
    "whatsappCloud": {
      "enabled": false,
      "accessTokenEnv": "WHATSAPP_ACCESS_TOKEN",
      "phoneNumberIdEnv": "WHATSAPP_PHONE_NUMBER_ID",
      "verifyTokenEnv": "WHATSAPP_VERIFY_TOKEN"
    }
  }
}
```

## Commands

```bash
node src/cli.js channels
```

## Production work still needed

- Telegram polling/webhook lifecycle
- Discord Gateway session handling
- Slack signature verification and Socket Mode
- WhatsApp webhook signature verification and message window handling
- per-channel allowlists and rate limits
- attachment/media normalization

# Policy and Secrets

## Policy-as-code

TunaFlowAI evaluates tool actions through policy rules before default risk handling.

Default behavior:

```text
low      -> allow
medium   -> require approval
high     -> require approval
critical -> deny
```

Rules live in `policies/default.policy.json` by default.

## Secrets vault

Secrets can be stored locally instead of being exposed in prompts or plain config.

```bash
node src/cli.js secrets set TELEGRAM_CHAT_ID 123456
node src/cli.js secrets list
node src/cli.js secrets get TELEGRAM_CHAT_ID
node src/cli.js secrets delete TELEGRAM_CHAT_ID
```

For encryption, set:

```bash
export TUNAFLOW_SECRETS_KEY="a-long-random-secret"
```

Secrets should never be injected directly into model context.

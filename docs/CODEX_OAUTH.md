# OpenAI Codex OAuth Provider

TunaFlowAI can keep the normal OpenAI API provider and also use Codex through ChatGPT OAuth.

## What this adds

- `openai-main`: regular OpenAI-compatible API provider using `OPENAI_API_KEY`.
- `openai-codex`: local Codex CLI provider using the cached ChatGPT OAuth login from `codex login`.
- `code` chain: tries `openai-codex`, then `openai-main`, then `local-mock-fallback`.

## Setup on the trusted PC/server

```bash
npm i -g @openai/codex@latest
codex login
# For headless/SSH machines:
codex login --device-auth
```

Then enable the model in `config/tunaflow.config.json`. If `gpt-5.5` is not available in your Codex account yet, change `model` to `gpt-5.4` or remove the field so Codex uses its default:

```json
{
  "name": "openai-codex",
  "provider": "codex-cli",
  "auth": "chatgpt-oauth",
  "model": "gpt-5.5",
  "enabled": true,
  "args": ["exec", "--ephemeral", "--sandbox", "read-only"],
  "passOpenAiApiKey": false
}
```

By default the Codex subprocess removes `OPENAI_API_KEY` from its environment so it prefers the ChatGPT OAuth session. The normal `openai-main` API model still keeps `OPENAI_API_KEY` support.

## When command is required

Codex OAuth cannot be completed fully from the browser dashboard because it depends on the local Codex CLI credential store or OS keyring. Run `codex login` on the trusted PC/server. After login, TunaFlowAI can call Codex through the `codex-cli` provider.

Heavy or risky actions should remain approval gated:

- `codex exec --full-auto` or writable sandbox actions.
- `run_command` tool calls.
- Live ad-platform mutations.
- Real calendar scheduling or ticket booking.
- OCR/scanned PDF parsing.

Use read-only Codex args first. Only switch to `--full-auto` or broader sandbox modes in an isolated trusted workspace.

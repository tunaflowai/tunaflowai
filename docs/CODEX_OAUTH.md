# OpenAI Codex CLI with ChatGPT OAuth

TunaFlowAI supports two OpenAI paths:

1. `openai` / `openai-compatible` for the standard OpenAI API key flow.
2. `openai-codex` / `codex-cli` for the local Codex CLI authenticated with ChatGPT OAuth.

## Local setup

Run these commands once on the same PC or server that runs TunaFlowAI:

```bash
npm i -g @openai/codex@latest
codex
```

The first launch prompts you to sign in. Choose ChatGPT sign-in, not API-key authentication. Some Codex CLI versions also expose explicit login commands such as `codex login` or device login for headless machines; use those only when available in your installed CLI.

The Codex provider intentionally removes `OPENAI_API_KEY` from the Codex subprocess unless `passOpenAiApiKey` is set to `true`, so the default path uses the local ChatGPT OAuth session.

## Example model config

```json
{
  "name": "openai-codex-cli",
  "provider": "openai-codex",
  "auth": "chatgpt-oauth",
  "codexModel": "gpt-5.5",
  "enabled": true,
  "args": ["exec", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check"],
  "passOpenAiApiKey": false,
  "capabilities": ["text", "json", "code", "reasoning", "local-cli"]
}
```

## Safety notes

The default sandbox is `read-only`. Use `workspace-write` only for approved coding tasks. Use `danger-full-access` only in a disposable or fully controlled environment.

Heavy local tasks, such as installing Codex, logging in with OAuth, running FFmpeg, accessing thermal printers, or launching sub-agents, must still be performed from the PC/server command line or through an approved local adapter.

Model note: OpenAI currently recommends starting Codex with `gpt-5.5` when it is available through ChatGPT sign-in, and using `gpt-5.4` during rollout if `gpt-5.5` is not available. You can still set `codexModel` to `gpt-5.3-codex` for coding-specific compatibility.

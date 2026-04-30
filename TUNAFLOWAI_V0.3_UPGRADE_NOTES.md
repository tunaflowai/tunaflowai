# TunaFlowAI v0.3 Maturity Pack

This pack upgrades the v0.2 runtime foundation with provider, skills, and channel layers.

## Added

### Provider registry

- `src/models/provider-registry.js`
- `src/models/model-catalog.js`
- native `anthropic` provider
- native `gemini` provider
- stronger OpenAI-compatible provider with `extraBody`, headers, JSON mode, JSON schema support, tools pass-through, and reasoning pass-through
- provider presets for OpenAI, Qwen/DashScope, MiniMax, DeepSeek, Kimi/Moonshot, OpenRouter, Groq, Together, Ollama, LM Studio, and vLLM

### Skills

- `SkillLoader`
- `SkillSelector`
- bundled skills:
  - `terminal-debugger`
  - `code-reviewer`
  - `daily-reporter`
  - `customer-support-drafter`
  - `browser-researcher`
- skill hashes recorded in audit when selected
- skills are instruction-only and cannot grant tool permissions

### Channels

- `ChannelRegistry`
- `OutboundRouter`
- webhook/webchat adapter
- Telegram adapter foundation
- Discord adapter foundation
- Slack adapter foundation
- WhatsApp Cloud adapter foundation
- `send_reply` now routes through the outbound router when available

### Gateway and CLI

New or expanded endpoints:

- `GET /models/catalog`
- `GET /skills`
- `GET /channels`
- `POST /channels/:id/webhook`

New CLI commands:

- `tunaflow models catalog`
- `tunaflow skills`
- `tunaflow channels`

### Docs

- `docs/MODELS.md`
- `docs/SKILLS.md`
- `docs/CHANNELS.md`
- `docs/MATURITY_PLAN.md`

## Validated

```bash
npm test
npm run demo
npm run check
```

Expected test status:

```text
6 smoke tests passed
5 test files passed
```

## Recommended branch name

```bash
git checkout -b v0.3-provider-skills-channels
```

## Apply options

Use the full folder if you want to replace your working tree, or apply the patch if your repo already matches v0.2.

```bash
git apply tunaflowai_v0.3_maturity.patch
npm test
npm run demo
npm run check
```

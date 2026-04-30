# TunaFlowAI Roadmap

## v0.3 alpha - provider, skills, and channels foundation

Included in this package:

- provider registry
- native Gemini provider
- native Anthropic provider
- OpenAI-compatible provider presets for OpenAI, Qwen, MiniMax, DeepSeek, Kimi/Moonshot, OpenRouter, Ollama, LM Studio, vLLM, and more
- model catalog endpoint and CLI
- skills loader/selector
- bundled skills
- channel registry
- outbound router
- webhook, Telegram, Discord, Slack, and WhatsApp Cloud adapter foundations
- expanded tests

## v0.3 closeout

- mocked HTTP tests for each model provider
- endpoint tests for gateway routes
- Slack signing verification
- WhatsApp webhook signature verification
- Telegram webhook/polling lifecycle
- per-channel allowlists
- cost and rate-limit metadata
- stricter plan schema validation

## v0.4 - product UX

- Approval Center dashboard
- Run trace viewer
- Model health dashboard
- Skill allowlist UI
- Channel settings UI
- Task graph and per-task budget manager

## v0.5 - work execution

- browser observer
- browser operator
- terminal error parser
- recursive file observer
- verification loop v2
- replayable runs

## v0.6 - extension ecosystem

- plugin SDK for providers, tools, skills, and channels
- signed manifests
- plugin permission declarations
- extension registry format

## v1.0 - production hardening

- sandbox runner for command execution
- secrets vault
- policy-as-code
- remote tamper-evident audit option
- RBAC
- multi-tenant deployment mode
- observability and metrics

# How TunaFlowAI Compares

TunaFlowAI is not trying to be a full clone of large agent platforms. It is a focused runtime for event-driven, token-efficient automation.

## TunaFlowAI vs general agent frameworks

General agent frameworks often start with prompts, chains, and tool calls. TunaFlowAI starts with work events and compact state.

| Area | TunaFlowAI focus | Typical general framework focus |
| --- | --- | --- |
| Trigger model | Events that matter | Prompt/request flow |
| Context | Compact state snapshot | Conversation or chain context |
| Model strategy | First-class fallback chains | Usually one configured model, fallback added separately |
| Tool safety | Risk levels and approvals by default | Varies by framework |
| Storage | Event, state, approval, and audit logs | Often app-defined |
| MVP target | Local work automation runtime | Broad agent app development |

## TunaFlowAI vs production automation platforms

Production platforms usually ship with hosted dashboards, accounts, permissions, integrations, billing, and enterprise controls. TunaFlowAI is currently a local-first MVP. Its value is the small, understandable core that developers can extend.

## Design principles

1. **Observe before acting** — everything starts as an event.
2. **Store raw data, send compact context** — avoid wasting tokens on repetitive history.
3. **Fallback is infrastructure, not an afterthought** — models fail, slow down, or become expensive.
4. **Permissions are part of the runtime** — tool execution should be gated by risk.
5. **Audit everything important** — events, model attempts, approvals, tool calls, and failures should be traceable.

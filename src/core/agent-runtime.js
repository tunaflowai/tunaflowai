import { createId, now } from './utils.js';

export class AgentRuntime {
  constructor({ eventStore, stateEngine, contextCompressor, modelRouter, toolRegistry, permissionEngine, auditLog, config = {} }) {
    this.eventStore = eventStore;
    this.stateEngine = stateEngine;
    this.contextCompressor = contextCompressor;
    this.modelRouter = modelRouter;
    this.toolRegistry = toolRegistry;
    this.permissionEngine = permissionEngine;
    this.auditLog = auditLog;
    this.config = config;
  }

  async init() {
    await this.eventStore.init();
    await this.auditLog.init();
    await this.stateEngine.init();
    await this.permissionEngine.init();
  }

  async handleEvent(inputEvent) {
    const event = await this.eventStore.append({ timestamp: now(), ...inputEvent });
    await this.auditLog.record('event.received', event);
    const state = await this.stateEngine.updateFromEvent(event);

    if (!this.shouldTriggerAgent(event)) {
      return { status: 'observed', event, stateSummary: summarizeState(state) };
    }

    const runId = createId('run');
    const context = await this.contextCompressor.build({
      event,
      state,
      budget: this.config.tokenBudget || {}
    });

    await this.auditLog.record('agent.context_built', { runId, approxTokens: context.approxTokens, eventId: event.id });

    const messages = [
      { role: 'system', content: systemPrompt(this.toolRegistry.list()) },
      { role: 'user', content: JSON.stringify(context, null, 2) }
    ];

    const modelResult = await this.modelRouter.complete({
      messages,
      json: true,
      chain: chooseChain(event),
      taskType: event.type,
      maxOutputTokens: this.config.tokenBudget?.maxOutputTokens || 1200
    });

    const plan = normalizePlan(modelResult.json);
    const actionResults = [];

    for (const action of plan.actions) {
      const tool = this.toolRegistry.get(action.tool);
      const decision = await this.permissionEngine.evaluate({ tool, action, event, runId });
      if (!decision.allowed) {
        actionResults.push({ action, decision, status: decision.requiresApproval ? 'waiting_approval' : 'denied' });
        continue;
      }

      try {
        const result = await this.toolRegistry.execute(action, {
          dataDir: this.config.runtime?.dataDir,
          stateEngine: this.stateEngine,
          event,
          runId
        });
        actionResults.push({ action, decision, status: 'success', result });
      } catch (error) {
        actionResults.push({ action, decision, status: 'failed', error: error.message });
      }
    }

    const run = {
      id: runId,
      eventId: event.id,
      status: actionResults.some((item) => item.status === 'failed') ? 'partial_failure' : 'done',
      model: modelResult.model,
      attempts: modelResult.attempts,
      summary: plan.summary,
      plan: plan.plan,
      actionResults,
      createdAt: now()
    };

    await this.stateEngine.recordRun(run);
    await this.auditLog.record('agent.run_finished', run);
    return { status: 'handled', event, run, modelResult: { model: modelResult.model, attempts: modelResult.attempts, usage: modelResult.usage } };
  }

  shouldTriggerAgent(event) {
    if (event.type === 'user.message' || event.type === 'chat.message') return true;
    if (event.type === 'terminal.output') return /error|failed|exception|traceback|cannot|not found/i.test(event.text || event.payload?.text || '');
    if (event.type === 'agent.result_failed') return true;
    return Boolean(this.config.runtime?.proactive && event.priority === 'high');
  }
}

function chooseChain(event) {
  if (event.priority === 'low') return 'cheap';
  if (event.priority === 'high') return 'strong';
  return 'default';
}

function normalizePlan(value) {
  return {
    summary: value.summary || 'No summary returned',
    plan: Array.isArray(value.plan) ? value.plan : [],
    actions: Array.isArray(value.actions) ? value.actions : [],
    confidence: value.confidence ?? null,
    requiresApproval: Boolean(value.requiresApproval)
  };
}

function summarizeState(state) {
  return {
    activeTask: state.activeTask,
    currentFile: state.currentFile,
    currentPage: state.currentPage,
    recentErrors: (state.recentErrors || []).length
  };
}

function systemPrompt(tools) {
  return `You are TunaFlow, an event-driven work operating agent.\n\nCore rules:\n- Be token efficient. Use the compact state, not raw history.\n- Act only when the event matters.\n- Prefer safe tools. Risky tools require approval.\n- Always return valid JSON only. No markdown.\n\nReturn this schema:\n{\n  "summary": "short summary",\n  "plan": ["step 1", "step 2"],\n  "actions": [{"tool": "send_reply", "args": {"message": "..."}}],\n  "confidence": 0.0,\n  "requiresApproval": false\n}\n\nAvailable tools:\n${JSON.stringify(tools, null, 2)}`;
}

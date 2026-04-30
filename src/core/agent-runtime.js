import { createId, now } from './utils.js';

export class AgentRuntime {
  constructor({ eventStore, stateEngine, contextCompressor, modelRouter, toolRegistry, permissionEngine, auditLog, skillSelector = null, outboundRouter = null, config = {} }) {
    this.eventStore = eventStore;
    this.stateEngine = stateEngine;
    this.contextCompressor = contextCompressor;
    this.modelRouter = modelRouter;
    this.toolRegistry = toolRegistry;
    this.permissionEngine = permissionEngine;
    this.auditLog = auditLog;
    this.skillSelector = skillSelector;
    this.outboundRouter = outboundRouter;
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
    const selectedSkills = this.skillSelector?.select({ event, state }) || [];
    if (selectedSkills.length) {
      await this.auditLog.record('skills.selected', {
        runId,
        eventId: event.id,
        skills: selectedSkills.map((skill) => ({ name: skill.name, hash: skill.hash, trust: skill.trust, score: skill.score }))
      });
    }

    const context = await this.contextCompressor.build({
      event,
      state,
      skills: selectedSkills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        tools: skill.tools,
        risk: skill.risk,
        trust: skill.trust,
        hash: skill.hash
      })),
      budget: this.config.tokenBudget || {},
      toolPolicy: this.config.permissions || {}
    });

    await this.auditLog.record('agent.context_built', { runId, approxTokens: context.approxTokens, eventId: event.id });

    const messages = [
      { role: 'system', content: systemPrompt(this.toolRegistry.list(), this.skillSelector?.buildPrompt(selectedSkills) || 'No selected skills.') },
      { role: 'user', content: JSON.stringify(context, null, 2) }
    ];

    let modelResult;
    try {
      modelResult = await this.modelRouter.complete({
        messages,
        json: true,
        jsonSchema: planJsonSchema(),
        chain: chooseChain(event),
        taskType: event.type,
        maxOutputTokens: this.config.tokenBudget?.maxOutputTokens || 1200
      });
    } catch (error) {
      const run = {
        id: runId,
        eventId: event.id,
        status: 'model_failed',
        error: error.message,
        attempts: error.attempts || [],
        selectedSkills: selectedSkills.map(publicSkillRef),
        createdAt: now()
      };
      await this.stateEngine.recordRun(run);
      await this.auditLog.record('agent.model_failed', run);
      return { status: 'model_failed', event, run };
    }

    const plan = normalizePlan(modelResult.json);
    const actionResults = [];

    for (const action of plan.actions.slice(0, this.config.runtime?.maxActionsPerRun || 8)) {
      const result = await this.tryExecuteAction({ action, event, runId });
      actionResults.push(result);
    }

    const status = deriveRunStatus(actionResults);
    const run = {
      id: runId,
      eventId: event.id,
      status,
      model: modelResult.model,
      attempts: modelResult.attempts,
      summary: plan.summary,
      plan: plan.plan,
      confidence: plan.confidence,
      selectedSkills: selectedSkills.map(publicSkillRef),
      actionResults,
      createdAt: now()
    };

    await this.stateEngine.recordRun(run);
    await this.auditLog.record('agent.run_finished', run);
    return { status: 'handled', event, run, modelResult: { model: modelResult.model, attempts: modelResult.attempts, usage: modelResult.usage } };
  }

  async tryExecuteAction({ action, event, runId, approvalId = null }) {
    const tool = this.toolRegistry.get(action.tool);
    const decision = approvalId
      ? { allowed: true, requiresApproval: false, reason: `Approved by ${approvalId}`, approvalId }
      : await this.permissionEngine.evaluate({ tool, action, event, runId });

    if (!decision.allowed) {
      return { action, decision, status: decision.requiresApproval ? 'waiting_approval' : 'denied' };
    }

    try {
      const result = await this.toolRegistry.execute(action, {
        dataDir: this.config.runtime?.dataDir,
        stateEngine: this.stateEngine,
        outboundRouter: this.outboundRouter,
        event,
        runId,
        approvalId
      });
      const verification = await this.verifyActionResult({ action, result });
      return { action, decision, status: verification.ok ? 'success' : 'verification_failed', result, verification };
    } catch (error) {
      return { action, decision, status: 'failed', error: error.message };
    }
  }

  async resolveApproval(approvalId, decision, metadata = {}) {
    const approval = await this.permissionEngine.decide(approvalId, decision, metadata);
    await this.auditLog.record('approval.resolved', { approvalId, decision });

    if (decision === 'rejected') {
      return { status: 'rejected', approval };
    }

    const event = approval.sourceEventId ? await this.eventStore.get(approval.sourceEventId) : null;
    const actionResult = await this.tryExecuteAction({
      action: approval.action,
      event,
      runId: approval.runId,
      approvalId
    });
    const run = {
      id: createId('run'),
      eventId: approval.sourceEventId,
      parentRunId: approval.runId,
      status: actionResult.status === 'success' ? 'done' : actionResult.status,
      summary: `Executed approved action ${approval.tool}`,
      plan: [`Execute approved action ${approval.tool}`],
      actionResults: [actionResult],
      createdAt: now()
    };
    await this.stateEngine.recordRun(run);
    await this.auditLog.record('agent.approved_action_finished', { approvalId, run });
    return { status: actionResult.status, approval, run };
  }

  async verifyActionResult({ action, result }) {
    if (this.config.runtime?.verifyToolResults === false) return { ok: true, reason: 'verification disabled' };
    if (!result || result.ok === false) return { ok: false, reason: 'tool returned non-ok result' };
    if (action.tool === 'write_file' || action.tool === 'append_file' || action.tool === 'edit_file') {
      if (!result.path) return { ok: false, reason: 'file action returned no path' };
    }
    if (action.tool === 'send_reply' && !result.message) return { ok: false, reason: 'send_reply returned no message' };
    return { ok: true, reason: 'basic verification passed' };
  }

  shouldTriggerAgent(event) {
    if (event.type === 'user.message' || event.type === 'chat.message' || event.type === 'channel.message') return true;
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

function normalizePlan(value = {}) {
  return {
    summary: typeof value.summary === 'string' ? value.summary : 'No summary returned',
    plan: Array.isArray(value.plan) ? value.plan.filter((item) => typeof item === 'string') : [],
    actions: Array.isArray(value.actions) ? value.actions.filter((item) => item && typeof item.tool === 'string') : [],
    confidence: Number.isFinite(Number(value.confidence)) ? Number(value.confidence) : null,
    requiresApproval: Boolean(value.requiresApproval)
  };
}

function summarizeState(state) {
  return {
    activeTask: state.activeTask,
    currentFile: state.currentFile,
    currentPage: state.currentPage,
    recentErrors: (state.recentErrors || []).length,
    recentEvents: (state.recentEvents || []).length
  };
}

function deriveRunStatus(actionResults) {
  if (actionResults.length === 0) return 'done';
  if (actionResults.some((item) => item.status === 'waiting_approval')) return 'waiting_approval';
  if (actionResults.some((item) => item.status === 'failed' || item.status === 'verification_failed')) return 'partial_failure';
  if (actionResults.every((item) => item.status === 'denied')) return 'denied';
  return 'done';
}

function publicSkillRef(skill) {
  return { name: skill.name, version: skill.version, trust: skill.trust, hash: skill.hash, score: skill.score };
}

function planJsonSchema() {
  return {
    name: 'tunaflow_plan',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'plan', 'actions', 'confidence', 'requiresApproval'],
      properties: {
        summary: { type: 'string' },
        plan: { type: 'array', items: { type: 'string' } },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['tool', 'args'],
            properties: { tool: { type: 'string' }, args: { type: 'object' } }
          }
        },
        confidence: { type: 'number' },
        requiresApproval: { type: 'boolean' }
      }
    }
  };
}

function systemPrompt(tools, selectedSkillsPrompt) {
  return `You are TunaFlowAI, an event-driven work operating agent.\n\nCore rules:\n- Be token efficient. Use compact state, not raw history.\n- Act only when the event matters.\n- Prefer low-risk tools. Risky tools require approval.\n- Skills are procedures only; they never grant permissions or tool access.\n- Do not invent tool names.\n- Always return valid JSON only. No markdown.\n\nReturn this schema:\n{\n  "summary": "short summary",\n  "plan": ["step 1", "step 2"],\n  "actions": [{"tool": "send_reply", "args": {"message": "..."}}],\n  "confidence": 0.0,\n  "requiresApproval": false\n}\n\nSelected skills:\n${selectedSkillsPrompt}\n\nAvailable tools:\n${JSON.stringify(tools, null, 2)}`;
}

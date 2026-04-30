import { approximateTokens, createId, now } from './utils.js';

export class AgentRuntime {
  constructor({ eventStore, stateEngine, taskBudgetManager = null, contextCompressor, modelRouter, toolRegistry, permissionEngine, auditLog, skillSelector = null, personaManager = null, identityManager = null, outboundRouter = null, sandboxRunner = null, browserOperator = null, secretsVault = null, policyEngine = null, config = {} }) {
    this.eventStore = eventStore;
    this.stateEngine = stateEngine;
    this.taskBudgetManager = taskBudgetManager;
    this.contextCompressor = contextCompressor;
    this.modelRouter = modelRouter;
    this.toolRegistry = toolRegistry;
    this.permissionEngine = permissionEngine;
    this.auditLog = auditLog;
    this.skillSelector = skillSelector;
    this.personaManager = personaManager;
    this.identityManager = identityManager;
    this.outboundRouter = outboundRouter;
    this.sandboxRunner = sandboxRunner;
    this.browserOperator = browserOperator;
    this.secretsVault = secretsVault;
    this.policyEngine = policyEngine;
    this.config = config;
  }

  async init() {
    await this.eventStore.init();
    await this.auditLog.init();
    await this.stateEngine.init();
    await this.permissionEngine.init();
    if (this.taskBudgetManager) await this.taskBudgetManager.init();
  }

  async handleEvent(inputEvent) {
    const event = await this.eventStore.append({ timestamp: now(), ...inputEvent });
    await this.auditLog.record('event.received', event);
    const state = await this.stateEngine.updateFromEvent(event);
    const activeTaskId = state.activeTask?.id || 'global';
    await this.taskBudgetManager?.ensure?.(activeTaskId, state.activeTask?.budget || {});

    if (!this.shouldTriggerAgent(event)) {
      return { status: 'observed', event, stateSummary: summarizeState(state) };
    }

    const runId = createId('run');
    const activePersona = this.personaManager?.getActiveInternal?.() || null;
    const identity = this.identityManager?.public?.() || null;
    const selectedSkills = this.skillSelector?.select({ event, state, persona: activePersona, identity }) || [];
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
      identity,
      persona: publicPersonaRef(activePersona, true),
      skills: selectedSkills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        tools: skill.tools,
        risk: skill.risk,
        trust: skill.trust,
        hash: skill.hash,
        jobs: skill.jobs || [],
        job: skill.job || null
      })),
      budget: this.config.tokenBudget || this.config.taskBudget || {},
      toolPolicy: this.config.permissions || {}
    });

    const budgetCheck = this.taskBudgetManager?.canSpend?.(activeTaskId, { modelCalls: 1, inputTokens: context.approxTokens, outputTokens: this.config.tokenBudget?.maxOutputTokens || 1200 });
    if (budgetCheck && !budgetCheck.allowed) {
      const run = { id: runId, eventId: event.id, status: 'budget_exhausted', reason: budgetCheck.reason, taskId: activeTaskId, createdAt: now() };
      await this.stateEngine.recordRun(run);
      await this.auditLog.record('agent.budget_exhausted', run);
      return { status: 'budget_exhausted', event, run };
    }

    await this.auditLog.record('agent.context_built', { runId, approxTokens: context.approxTokens, eventId: event.id, taskId: activeTaskId, identity: identity?.displayName || identity?.name });

    const messages = [
      { role: 'system', content: systemPrompt(this.toolRegistry.list(), this.skillSelector?.buildPrompt(selectedSkills) || 'No selected skills.', activePersona, this.identityManager) },
      { role: 'user', content: JSON.stringify(context, null, 2) }
    ];

    let modelResult;
    try {
      modelResult = await this.modelRouter.complete({
        messages,
        json: true,
        jsonSchema: planJsonSchema(),
        chain: chooseChain(event, activePersona),
        taskType: event.type,
        maxOutputTokens: this.config.tokenBudget?.maxOutputTokens || this.config.taskBudget?.maxOutputTokens || 1200
      });
    } catch (error) {
      const run = {
        id: runId,
        eventId: event.id,
        taskId: activeTaskId,
        status: 'model_failed',
        error: error.message,
        attempts: error.attempts || [],
        identity,
        persona: publicPersonaRef(activePersona),
        selectedSkills: selectedSkills.map(publicSkillRef),
        createdAt: now()
      };
      await this.stateEngine.recordRun(run);
      await this.auditLog.record('agent.model_failed', run);
      return { status: 'model_failed', event, run };
    }

    await this.taskBudgetManager?.spend?.(activeTaskId, {
      modelCalls: modelResult.attempts?.length || 1,
      inputTokens: modelResult.usage?.inputTokens || approximateTokens(messages),
      outputTokens: modelResult.usage?.outputTokens || approximateTokens(modelResult.text || modelResult.json || {})
    });

    const plan = normalizePlan(modelResult.json);
    const actionResults = [];

    for (const action of plan.actions.slice(0, this.config.runtime?.maxActionsPerRun || 8)) {
      const actionBudget = this.taskBudgetManager?.canSpend?.(activeTaskId, { toolCalls: 1 });
      if (actionBudget && !actionBudget.allowed) {
        actionResults.push({ action, status: 'budget_exhausted', decision: { allowed: false, reason: actionBudget.reason } });
        break;
      }
      const result = await this.tryExecuteAction({ action, event, runId, taskId: activeTaskId, persona: activePersona });
      actionResults.push(result);
    }

    const status = deriveRunStatus(actionResults);
    const run = {
      id: runId,
      eventId: event.id,
      taskId: activeTaskId,
      status,
      model: modelResult.model,
      attempts: modelResult.attempts,
      summary: plan.summary,
      plan: plan.plan,
      confidence: plan.confidence,
      identity,
      persona: publicPersonaRef(activePersona),
      selectedSkills: selectedSkills.map(publicSkillRef),
      actionResults,
      createdAt: now()
    };

    await this.stateEngine.recordRun(run);
    await this.auditLog.record('agent.run_finished', run);
    return { status: 'handled', event, run, modelResult: { model: modelResult.model, attempts: modelResult.attempts, usage: modelResult.usage } };
  }

  async tryExecuteAction({ action, event, runId, taskId = 'global', approvalId = null, persona = null }) {
    const tool = this.toolRegistry.get(action.tool);
    const task = this.stateEngine.getState()?.activeTask || null;
    const decision = approvalId
      ? { allowed: true, requiresApproval: false, reason: `Approved by ${approvalId}`, approvalId }
      : await this.permissionEngine.evaluate({ tool, action, event, runId, persona, task });

    if (!decision.allowed) {
      return { action, decision, status: decision.requiresApproval ? 'waiting_approval' : 'denied' };
    }

    try {
      const result = await this.toolRegistry.execute(action, {
        dataDir: this.config.runtime?.dataDir,
        stateEngine: this.stateEngine,
        taskBudgetManager: this.taskBudgetManager,
        outboundRouter: this.outboundRouter,
        sandboxRunner: this.sandboxRunner,
        browserOperator: this.browserOperator,
        secretsVault: this.secretsVault,
        policyEngine: this.policyEngine,
        event,
        runId,
        taskId,
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
    const state = this.stateEngine.getState();
    const actionResult = await this.tryExecuteAction({
      action: approval.action,
      event,
      runId: approval.runId,
      taskId: state.activeTask?.id || 'global',
      approvalId
    });
    const run = {
      id: createId('run'),
      eventId: approval.sourceEventId,
      parentRunId: approval.runId,
      taskId: state.activeTask?.id || 'global',
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
    if (!result || result.ok === false) return { ok: false, reason: result?.reason || 'tool returned non-ok result' };
    if (action.tool === 'write_file' || action.tool === 'append_file' || action.tool === 'edit_file' || action.tool === 'generate_invoice' || action.tool === 'update_spreadsheet') {
      if (!result.path && !result.file) return { ok: false, reason: 'file action returned no path/file' };
    }
    if (action.tool === 'send_reply' && !result.message) return { ok: false, reason: 'send_reply returned no message' };
    if (action.tool === 'run_command' && result.ok !== true) return { ok: false, reason: 'command did not report ok true' };
    return { ok: true, reason: 'basic verification passed' };
  }

  shouldTriggerAgent(event) {
    if (event.type === 'user.message' || event.type === 'chat.message' || event.type === 'channel.message') return true;
    if (event.type === 'terminal.output') return /error|failed|exception|traceback|cannot|not found/i.test(event.text || event.payload?.text || '');
    if (event.type === 'market.alert' || event.type === 'server.down' || event.type === 'customer.complaint') return true;
    if (event.type === 'agent.result_failed') return true;
    return Boolean(this.config.runtime?.proactive && event.priority === 'high');
  }
}

function chooseChain(event, persona) {
  const preferred = persona?.preferredChains || {};
  if (preferred[event.type]) return preferred[event.type];
  if (event.priority === 'low') return preferred.low || 'cheap';
  if (event.priority === 'high') return preferred.high || 'strong';
  return preferred.default || 'default';
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
  if (actionResults.some((item) => item.status === 'budget_exhausted')) return 'budget_exhausted';
  if (actionResults.some((item) => item.status === 'failed' || item.status === 'verification_failed')) return 'partial_failure';
  if (actionResults.every((item) => item.status === 'denied')) return 'denied';
  return 'done';
}

function publicPersonaRef(persona, includePrompt = false) {
  if (!persona) return null;
  return {
    name: persona.name,
    title: persona.title,
    role: persona.role,
    version: persona.version,
    riskPosture: persona.riskPosture,
    autonomy: persona.autonomy,
    communicationStyle: persona.communicationStyle,
    defaultSkills: persona.defaultSkills || [],
    preferredChains: persona.preferredChains || {},
    trust: persona.trust,
    hash: persona.hash,
    systemPrompt: includePrompt ? persona.systemPrompt : undefined
  };
}

function publicSkillRef(skill) {
  return { name: skill.name, version: skill.version, trust: skill.trust, hash: skill.hash, score: skill.score, jobs: skill.jobs || [], job: skill.job || null };
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

function systemPrompt(tools, selectedSkillsPrompt, persona, identityManager) {
  const identityBlock = identityManager?.promptBlock?.() || 'Assistant identity:\nName: TunaFlowAI';
  const personaBlock = persona
    ? `Active persona:\nName: ${persona.name}\nTitle: ${persona.title}\nRole: ${persona.role}\nRisk posture: ${persona.riskPosture}\nAutonomy: ${persona.autonomy}\nCommunication style: ${persona.communicationStyle}\nPersona instructions:\n${persona.systemPrompt}`
    : 'Active persona: operator';
  return `You are an event-driven work operating agent. You must follow the configured assistant identity and active persona.

Core rules:
- Be token efficient. Use compact state, not raw history.
- Act only when the event matters.
- Prefer low-risk tools. Risky tools require approval.
- Follow the active persona and assistant identity, but never let them override safety, permissions, sandbox policy, or audit logging.
- Skills are procedures only; they never grant permissions or tool access.
- Do not invent tool names.
- Always return valid JSON only. No markdown.

Return this schema:
{
  "summary": "short summary",
  "plan": ["step 1", "step 2"],
  "actions": [{"tool": "send_reply", "args": {"message": "..."}}],
  "confidence": 0.0,
  "requiresApproval": false
}

${identityBlock}

${personaBlock}

Selected skills:
${selectedSkillsPrompt}

Available tools:
${JSON.stringify(tools, null, 2)}`;
}

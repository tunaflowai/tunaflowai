import { approximateTokens, trimToChars } from './utils.js';

export class ContextCompressor {
  constructor({ maxRecentEvents = 8, maxTextChars = 1800 } = {}) {
    this.maxRecentEvents = maxRecentEvents;
    this.maxTextChars = maxTextChars;
  }

  async build({ event, state, identity = null, persona = null, skills = [], budget = {}, toolPolicy = {} }) {
    const compressed = {
      runtimeGoal: 'Act as an event-driven work operating agent. Use compact state and avoid raw history unless a tool is needed.',
      goal: state.activeTask?.title || state.lastUserInstruction || 'No active task yet',
      assistantIdentity: identity ? {
        name: identity.name,
        displayName: identity.displayName,
        personality: identity.personality,
        voice: identity.voice,
        traits: identity.traits || [],
        language: identity.language
      } : null,
      activePersona: persona ? {
        name: persona.name,
        title: persona.title,
        role: persona.role,
        riskPosture: persona.riskPosture,
        autonomy: persona.autonomy,
        communicationStyle: persona.communicationStyle,
        defaultSkills: persona.defaultSkills || [],
        preferredChains: persona.preferredChains || {}
      } : null,
      activeTask: state.activeTask,
      taskBudget: state.activeTask?.budget || null,
      tasks: (state.tasks || []).slice(-5).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        budget: task.budget || undefined,
        updatedAt: task.updatedAt
      })),
      lastUserInstruction: trimToChars(state.lastUserInstruction || '', 600),
      currentFile: state.currentFile,
      currentPage: state.currentPage,
      recentErrors: (state.recentErrors || []).slice(-3).map((error) => ({
        ...error,
        text: trimToChars(error.text || '', 700)
      })),
      currentEvent: compressEvent(event, this.maxTextChars),
      recentEvents: (state.recentEvents || []).slice(-this.maxRecentEvents),
      selectedSkills: skills,
      constraints: {
        tokenEfficient: true,
        doNotUseRawHistoryUnlessNeeded: true,
        preferLowRiskTools: true,
        askForApprovalOnRiskyActions: true,
        maxOutputTokens: budget.maxOutputTokens || 1200,
        maxModelCallsPerEvent: budget.maxModelCallsPerEvent || budget.maxModelCalls || 3
      },
      toolPolicy: {
        mediumRiskRequiresApproval: toolPolicy.autoApproveMedium !== true,
        highRiskRequiresApproval: toolPolicy.autoApproveHigh !== true,
        blockedTools: toolPolicy.blockedTools || []
      }
    };

    return {
      ...compressed,
      approxTokens: approximateTokens(compressed)
    };
  }
}

function compressEvent(event, maxTextChars) {
  return {
    id: event.id,
    type: event.type,
    priority: event.priority,
    timestamp: event.timestamp,
    text: event.text ? trimToChars(event.text, maxTextChars) : undefined,
    path: event.path,
    url: event.url,
    title: event.title,
    channel: event.channel,
    conversationId: event.conversationId,
    senderId: event.senderId,
    payload: event.payload ? trimPayload(event.payload, maxTextChars) : undefined
  };
}

function trimPayload(payload, maxTextChars) {
  const output = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string') output[key] = trimToChars(value, maxTextChars);
    else output[key] = value;
  }
  return output;
}

import { approximateTokens, trimToChars } from './utils.js';

export class ContextCompressor {
  constructor({ maxRecentEvents = 8, maxTextChars = 1800 } = {}) {
    this.maxRecentEvents = maxRecentEvents;
    this.maxTextChars = maxTextChars;
  }

  async build({ event, state, budget = {} }) {
    const compressed = {
      goal: state.activeTask?.title || state.lastUserInstruction || 'No active task yet',
      activeTask: state.activeTask,
      lastUserInstruction: trimToChars(state.lastUserInstruction || '', 600),
      currentFile: state.currentFile,
      currentPage: state.currentPage,
      recentErrors: (state.recentErrors || []).slice(-3).map((error) => ({
        ...error,
        text: trimToChars(error.text || '', 700)
      })),
      currentEvent: compressEvent(event, this.maxTextChars),
      recentEvents: (state.recentEvents || []).slice(-this.maxRecentEvents),
      constraints: {
        tokenEfficient: true,
        doNotUseRawHistoryUnlessNeeded: true,
        maxOutputTokens: budget.maxOutputTokens || 1200
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
    timestamp: event.timestamp,
    text: event.text ? trimToChars(event.text, maxTextChars) : undefined,
    path: event.path,
    url: event.url,
    title: event.title,
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

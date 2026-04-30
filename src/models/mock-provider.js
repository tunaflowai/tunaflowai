import { approximateTokens, sleep } from '../core/utils.js';

export class MockProvider {
  constructor(config = {}) {
    this.config = config;
    this.failedOnce = false;
  }

  async complete({ messages = [] }) {
    const behavior = this.config.behavior || 'ok';
    if (behavior === 'fail') throw new Error(`Mock model ${this.config.name} failed intentionally`);
    if (behavior === 'fail-once' && !this.failedOnce) {
      this.failedOnce = true;
      throw new Error(`Mock model ${this.config.name} failed once intentionally`);
    }
    if (behavior === 'timeout') await sleep((this.config.timeoutMs || 20000) + 1000);

    if (this.config.response) {
      const content = typeof this.config.response === 'string' ? this.config.response : JSON.stringify(this.config.response);
      return {
        content,
        usage: { inputTokens: approximateTokens(messages), outputTokens: approximateTokens(content) },
        raw: { provider: 'mock', behavior, customResponse: true }
      };
    }

    const last = messages[messages.length - 1]?.content || '';
    const lower = last.toLowerCase();
    const actions = [];
    let summary = 'TunaFlow observed the event and kept the state updated.';
    const plan = ['Observe the event', 'Update compact work state', 'Act only when needed'];

    if (lower.includes('terminal.output') && /(error|failed|exception|traceback|cannot|not found)/i.test(last)) {
      summary = 'A terminal error was detected. TunaFlow should inspect state and propose a safe next action.';
      plan.push('Inspect current state', 'Ask for approval before risky changes');
      actions.push({
        tool: 'send_reply',
        args: {
          message: 'Terminal error detected. I saved the context and can help investigate with a token-efficient workflow.'
        }
      });
    } else if (lower.includes('user.message') || lower.includes('chat.message')) {
      summary = 'A user instruction was received. TunaFlow acknowledged it and prepared the workspace state.';
      actions.push({
        tool: 'send_reply',
        args: {
          message: 'Instruction received. I will monitor meaningful events, keep compact work state, and call models only when needed.'
        }
      });
    }

    const content = JSON.stringify({
      summary,
      plan,
      actions,
      confidence: 0.82,
      requiresApproval: actions.some((action) => action.tool !== 'send_reply')
    });

    return {
      content,
      usage: {
        inputTokens: approximateTokens(messages),
        outputTokens: approximateTokens(content)
      },
      raw: { provider: 'mock', behavior }
    };
  }
}

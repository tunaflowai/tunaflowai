export class WebhookWatcher {
  constructor({ channel = 'webhook' } = {}) { this.channel = channel; }
  normalize(raw = {}) {
    return {
      type: raw.type || 'channel.message',
      channel: this.channel,
      conversationId: raw.conversationId || raw.threadId || 'webhook',
      senderId: raw.senderId || raw.from || 'webhook',
      text: raw.text || raw.message || '',
      payload: raw,
      priority: raw.priority || 'normal'
    };
  }
}

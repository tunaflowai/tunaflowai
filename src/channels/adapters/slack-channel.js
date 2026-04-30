export class SlackChannel {
  constructor({ id = 'slack', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'slack';
    this.config = config;
    this.auditLog = auditLog;
    this.capabilities = { send: true, receive: true, text: true };
  }

  token() {
    return this.config.botToken || process.env[this.config.botTokenEnv || 'SLACK_BOT_TOKEN'];
  }

  normalizeInbound(raw = {}) {
    const event = raw.event || raw;
    return {
      type: 'channel.message',
      channel: this.id,
      conversationId: event.channel || event.channel_id,
      senderId: event.user || event.user_id,
      text: event.text || '',
      payload: raw,
      priority: 'normal'
    };
  }

  async send(message) {
    const token = this.token();
    if (!token) throw new Error('Missing Slack bot token');
    const channel = message.conversationId;
    if (!channel) throw new Error('Slack send requires conversationId/channel id');
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel, text: message.text })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(`Slack send failed: ${data.error || response.status}`);
    return { ok: true, channel: this.id, provider: 'slack', raw: data };
  }
}

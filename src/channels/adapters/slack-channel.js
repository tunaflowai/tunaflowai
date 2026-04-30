import { verifySlackSignature } from '../webhook-security.js';

export class SlackChannel {
  constructor({ id = 'slack', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'slack';
    this.config = config;
    this.auditLog = auditLog;
    this.capabilities = { send: true, receive: true, text: true, webhook: true, signatureVerification: true };
  }

  token() { return this.config.botToken || process.env[this.config.botTokenEnv || 'SLACK_BOT_TOKEN']; }
  signingSecret() { return this.config.signingSecret || process.env[this.config.signingSecretEnv || 'SLACK_SIGNING_SECRET']; }

  verifyWebhook({ headers, rawBody }) {
    return verifySlackSignature({ signingSecret: this.signingSecret(), rawBody, headers });
  }

  normalizeInbound(raw = {}) {
    if (raw.type === 'url_verification') return { type: 'channel.verification', channel: this.id, text: raw.challenge || '', payload: raw, priority: 'low' };
    const event = raw.event || raw;
    return {
      type: 'channel.message',
      channel: this.id,
      conversationId: event.channel || event.channel_id,
      senderId: event.user || event.user_id,
      text: event.text || '',
      payload: raw,
      priority: /urgent|complaint|refund/i.test(event.text || '') ? 'high' : 'normal'
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

import { verifyHmacSha256 } from '../webhook-security.js';

export class WebhookChannel {
  constructor({ id = 'webhook', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'webhook';
    this.config = config;
    this.auditLog = auditLog;
    this.capabilities = { send: true, receive: true, text: true, webhook: true, signatureVerification: Boolean(config.secret || config.secretEnv) };
  }

  secret() { return this.config.secret || process.env[this.config.secretEnv || 'TUNAFLOW_WEBHOOK_SECRET']; }

  verifyWebhook({ headers, rawBody }) {
    return verifyHmacSha256({ secret: this.secret(), rawBody, header: headers['x-tunaflow-signature'], prefix: 'sha256=' });
  }

  normalizeInbound(raw = {}) {
    return {
      type: raw.type || 'channel.message',
      channel: this.id,
      conversationId: raw.conversationId || raw.chatId || raw.threadId || 'default',
      senderId: raw.senderId || raw.from || 'webhook-user',
      text: raw.text || raw.message || '',
      payload: raw.payload || raw,
      priority: raw.priority || 'normal'
    };
  }

  async send(message) {
    if (this.config.outboundWebhookUrl) {
      const response = await fetch(this.config.outboundWebhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.config.headers || {}) },
        body: JSON.stringify(message)
      });
      if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
    }
    return { ok: true, channel: this.id, conversationId: message.conversationId };
  }
}

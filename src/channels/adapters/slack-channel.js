import { verifySlackSignature } from '../webhook-security.js';

export class SlackChannel {
  constructor({ id = 'slack', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'slack';
    this.config = config;
    this.auditLog = auditLog;
    this.socket = null;
    this.capabilities = { send: true, receive: true, text: true, webhook: true, signatureVerification: true, socketMode: true };
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

  appToken() { return this.config.appToken || process.env[this.config.appTokenEnv || 'SLACK_APP_TOKEN']; }

  async start({ emit } = {}) {
    if (this.config.socketMode?.enabled !== true && this.config.socketModeEnabled !== true) return { ok: true, skipped: true, reason: 'Slack Socket Mode nonaktif' };
    const appToken = this.appToken();
    if (!appToken) throw new Error('Token Slack app untuk Socket Mode belum dikonfigurasi');
    const { WebSocket } = await optionalImportWs();
    const open = await fetch('https://slack.com/api/apps.connections.open', { method: 'POST', headers: { authorization: `Bearer ${appToken}` } });
    const data = await open.json().catch(() => ({}));
    if (!data.ok || !data.url) throw new Error(`Slack Socket Mode gagal dibuka: ${data.error || open.status}`);
    this.socket = new WebSocket(data.url);
    this.socket.on('message', (payload) => this.handleSocketMessage(payload, { emit }));
    this.socket.on('error', (error) => this.auditLog?.record?.('channel.slack.socket.error', { error: error.message }));
    return { ok: true, provider: 'slack', mode: 'socket' };
  }

  async stop() {
    this.socket?.close?.();
    this.socket = null;
    return { ok: true };
  }

  handleSocketMessage(payload, { emit } = {}) {
    let envelope;
    try { envelope = JSON.parse(String(payload)); } catch { return; }
    if (envelope.envelope_id) this.socket?.send?.(JSON.stringify({ envelope_id: envelope.envelope_id }));
    const event = envelope.payload?.event || envelope.payload || envelope;
    if (event?.type === 'message' && typeof emit === 'function') emit(this.normalizeInbound({ event, socketMode: true }));
  }
}

async function optionalImportWs() {
  try { return await import('ws'); }
  catch { throw new Error("Slack Socket Mode membutuhkan paket opsional 'ws'. Jalankan: npm install ws"); }
}

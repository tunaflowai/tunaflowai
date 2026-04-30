import { verifyDiscordSignature } from '../webhook-security.js';

export class DiscordChannel {
  constructor({ id = 'discord', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'discord';
    this.config = config;
    this.auditLog = auditLog;
    this.gateway = null;
    this.gatewaySeq = null;
    this.gatewaySessionId = null;
    this.gatewayHeartbeat = null;
    this.capabilities = { send: true, receive: true, text: true, webhook: true, interactions: true, signatureVerification: true, gatewayWebSocket: true };
  }

  token() { return this.config.token || process.env[this.config.tokenEnv || 'DISCORD_BOT_TOKEN']; }
  publicKey() { return this.config.publicKey || process.env[this.config.publicKeyEnv || 'DISCORD_PUBLIC_KEY']; }

  verifyWebhook({ headers, rawBody }) {
    const verified = verifyDiscordSignature({ publicKeyHex: this.publicKey(), rawBody, headers });
    if (!verified.ok) return verified;
    try {
      const body = JSON.parse(rawBody || '{}');
      if (body.type === 1) return { ok: true, response: { type: 1 } };
    } catch (_) {}
    return { ok: true };
  }

  normalizeInbound(raw = {}) {
    const message = raw.d || raw.message || raw;
    const interactionData = raw.data || {};
    return {
      type: 'channel.message',
      channel: this.id,
      conversationId: String(message.channel_id || raw.channel_id || raw.channelId || ''),
      senderId: String(message.author?.id || raw.member?.user?.id || raw.user?.id || ''),
      text: message.content || interactionData.options?.map((o) => o.value).join(' ') || interactionData.name || '',
      payload: raw,
      priority: 'normal'
    };
  }

  async send(message) {
    const token = this.token();
    if (!token) throw new Error('Missing Discord bot token');
    const channelId = message.conversationId;
    if (!channelId) throw new Error('Discord send requires conversationId/channel id');
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bot ${token}` },
      body: JSON.stringify({ content: message.text })
    });
    if (!response.ok) throw new Error(`Discord returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return { ok: true, channel: this.id, provider: 'discord', raw: await response.json().catch(() => null) };
  }

  async start({ emit } = {}) {
    if (this.config.gateway?.enabled !== true && this.config.gatewayEnabled !== true) return { ok: true, skipped: true, reason: 'Discord Gateway nonaktif' };
    const token = this.token();
    if (!token) throw new Error('Token bot Discord belum dikonfigurasi');
    const { WebSocket } = await optionalImportWs();
    const gatewayUrl = this.config.gateway?.url || 'wss://gateway.discord.gg/?v=10&encoding=json';
    this.gateway = new WebSocket(gatewayUrl);
    this.gateway.on('message', (data) => this.handleGatewayMessage(data, { emit, token }));
    this.gateway.on('close', () => this.clearGatewayHeartbeat());
    this.gateway.on('error', (error) => this.auditLog?.record?.('channel.discord.gateway.error', { error: error.message }));
    return { ok: true, provider: 'discord', mode: 'gateway' };
  }

  async stop() {
    this.clearGatewayHeartbeat();
    this.gateway?.close?.();
    this.gateway = null;
    return { ok: true };
  }

  handleGatewayMessage(data, { emit, token } = {}) {
    let packet;
    try { packet = JSON.parse(String(data)); } catch { return; }
    if (packet.s) this.gatewaySeq = packet.s;
    if (packet.op === 10) {
      this.clearGatewayHeartbeat();
      this.gatewayHeartbeat = setInterval(() => this.gateway?.send?.(JSON.stringify({ op: 1, d: this.gatewaySeq })), packet.d.heartbeat_interval);
      this.gateway.send(JSON.stringify({ op: 2, d: { token, intents: this.config.gateway?.intents ?? this.config.intents ?? 513, properties: { os: 'linux', browser: 'tunaflowai', device: 'tunaflowai' } } }));
      return;
    }
    if (packet.t === 'READY') this.gatewaySessionId = packet.d?.session_id || null;
    if (packet.t === 'MESSAGE_CREATE' && packet.d && typeof emit === 'function') emit(this.normalizeInbound({ d: packet.d, gateway: true }));
  }

  clearGatewayHeartbeat() {
    if (this.gatewayHeartbeat) clearInterval(this.gatewayHeartbeat);
    this.gatewayHeartbeat = null;
  }
}

async function optionalImportWs() {
  try { return await import('ws'); }
  catch { throw new Error("Discord Gateway membutuhkan paket opsional 'ws'. Jalankan: npm install ws"); }
}

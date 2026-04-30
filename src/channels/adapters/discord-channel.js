import { verifyDiscordSignature } from '../webhook-security.js';

export class DiscordChannel {
  constructor({ id = 'discord', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'discord';
    this.config = config;
    this.auditLog = auditLog;
    this.capabilities = { send: true, receive: true, text: true, webhook: true, interactions: true, signatureVerification: true };
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
}

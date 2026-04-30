export class DiscordChannel {
  constructor({ id = 'discord', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'discord';
    this.config = config;
    this.auditLog = auditLog;
    this.capabilities = { send: true, receive: true, text: true };
  }

  token() {
    return this.config.token || process.env[this.config.tokenEnv || 'DISCORD_BOT_TOKEN'];
  }

  normalizeInbound(raw = {}) {
    const message = raw.d || raw;
    return {
      type: 'channel.message',
      channel: this.id,
      conversationId: String(message.channel_id || message.channelId || ''),
      senderId: String(message.author?.id || message.user?.id || ''),
      text: message.content || '',
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

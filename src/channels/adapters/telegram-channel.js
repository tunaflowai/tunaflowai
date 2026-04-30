export class TelegramChannel {
  constructor({ id = 'telegram', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'telegram';
    this.config = config;
    this.auditLog = auditLog;
    this.capabilities = { send: true, receive: true, text: true };
  }

  token() {
    return this.config.token || process.env[this.config.tokenEnv || 'TELEGRAM_BOT_TOKEN'];
  }

  normalizeInbound(update = {}) {
    const message = update.message || update.edited_message || update.channel_post || {};
    return {
      type: 'channel.message',
      channel: this.id,
      conversationId: String(message.chat?.id || ''),
      senderId: String(message.from?.id || message.chat?.id || ''),
      text: message.text || message.caption || '',
      payload: update,
      priority: 'normal'
    };
  }

  async send(message) {
    const token = this.token();
    if (!token) throw new Error('Missing Telegram bot token');
    const chatId = message.conversationId || message.recipientId;
    if (!chatId) throw new Error('Telegram send requires conversationId/chat id');
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message.text })
    });
    if (!response.ok) throw new Error(`Telegram returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return { ok: true, channel: this.id, provider: 'telegram', raw: await response.json().catch(() => null) };
  }
}

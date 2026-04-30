import { verifyTelegramSecret } from '../webhook-security.js';

export class TelegramChannel {
  constructor({ id = 'telegram', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'telegram';
    this.config = config;
    this.auditLog = auditLog;
    this.capabilities = { send: true, receive: true, text: true, polling: true, webhook: true };
    this.running = false;
    this.offset = 0;
  }

  token() { return this.config.token || process.env[this.config.tokenEnv || 'TELEGRAM_BOT_TOKEN']; }
  webhookSecret() { return this.config.webhookSecret || process.env[this.config.webhookSecretEnv || 'TELEGRAM_WEBHOOK_SECRET']; }

  verifyWebhook({ headers }) { return verifyTelegramSecret({ expected: this.webhookSecret(), headers }); }

  async start({ emit } = {}) {
    if (this.config.polling !== true) return { ok: true, started: false, reason: 'polling disabled' };
    const token = this.token();
    if (!token) return { ok: false, started: false, error: 'Missing Telegram bot token' };
    this.running = true;
    const intervalMs = Number(this.config.pollingIntervalMs || 2500);
    const loop = async () => {
      while (this.running) {
        try {
          const updates = await this.getUpdates();
          for (const update of updates) {
            this.offset = Math.max(this.offset, Number(update.update_id || 0) + 1);
            const event = this.normalizeInbound(update);
            if (this.allowed(event) && emit) await emit(event);
          }
        } catch (error) {
          if (this.auditLog) await this.auditLog.record('channel.telegram.poll_error', { channel: this.id, error: error.message });
        }
        await sleep(intervalMs);
      }
    };
    this.loopPromise = loop();
    return { ok: true, started: true, mode: 'polling' };
  }

  async stop() { this.running = false; return { ok: true }; }

  async getUpdates() {
    const response = await fetch(`https://api.telegram.org/bot${this.token()}/getUpdates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ offset: this.offset, timeout: Number(this.config.longPollSeconds || 10), allowed_updates: ['message', 'edited_message', 'channel_post'] })
    });
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.description || `Telegram getUpdates HTTP ${response.status}`);
    return data.result || [];
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

  allowed(event) {
    const allowedUserIds = (this.config.allowedUserIds || []).map(String);
    const allowedChatIds = (this.config.allowedChatIds || []).map(String);
    if (allowedUserIds.length && !allowedUserIds.includes(String(event.senderId))) return false;
    if (allowedChatIds.length && !allowedChatIds.includes(String(event.conversationId))) return false;
    return true;
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

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

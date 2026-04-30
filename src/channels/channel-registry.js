import { WebhookChannel } from './adapters/webhook-channel.js';
import { TelegramChannel } from './adapters/telegram-channel.js';
import { DiscordChannel } from './adapters/discord-channel.js';
import { SlackChannel } from './adapters/slack-channel.js';
import { WhatsAppCloudChannel } from './adapters/whatsapp-cloud-channel.js';

const ADAPTERS = {
  webhook: WebhookChannel,
  webchat: WebhookChannel,
  telegram: TelegramChannel,
  discord: DiscordChannel,
  slack: SlackChannel,
  whatsappCloud: WhatsAppCloudChannel,
  'whatsapp-cloud': WhatsAppCloudChannel
};

export class ChannelRegistry {
  constructor({ config = {}, auditLog = null } = {}) {
    this.config = config;
    this.auditLog = auditLog;
    this.adapters = new Map();
  }

  async init() {
    for (const [id, channelConfig] of Object.entries(this.config || {})) {
      if (channelConfig?.enabled === false) continue;
      const Adapter = ADAPTERS[id] || ADAPTERS[channelConfig?.adapter];
      if (!Adapter) continue;
      const adapter = new Adapter({ id, config: channelConfig, auditLog: this.auditLog });
      this.adapters.set(id, adapter);
      if (adapter.init) await adapter.init();
    }
    if (!this.adapters.has('webhook')) {
      this.adapters.set('webhook', new WebhookChannel({ id: 'webhook', config: { enabled: true }, auditLog: this.auditLog }));
    }
    if (this.auditLog) await this.auditLog.record('channels.loaded', { channels: this.list().map((channel) => channel.id) });
  }

  get(id) {
    return this.adapters.get(id) || null;
  }

  list() {
    return [...this.adapters.values()].map((adapter) => ({
      id: adapter.id,
      type: adapter.type,
      enabled: adapter.enabled !== false,
      capabilities: adapter.capabilities || {}
    }));
  }

  async send(message) {
    const channelId = message.channel || 'webhook';
    const adapter = this.get(channelId);
    if (!adapter || !adapter.send) {
      throw new Error(`No channel adapter available for ${channelId}`);
    }
    return adapter.send(message);
  }
}

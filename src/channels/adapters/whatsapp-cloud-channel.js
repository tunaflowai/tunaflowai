export class WhatsAppCloudChannel {
  constructor({ id = 'whatsappCloud', config = {}, auditLog = null } = {}) {
    this.id = id;
    this.type = 'whatsapp-cloud';
    this.config = config;
    this.auditLog = auditLog;
    this.capabilities = { send: true, receive: true, text: true };
  }

  token() {
    return this.config.accessToken || process.env[this.config.accessTokenEnv || 'WHATSAPP_ACCESS_TOKEN'];
  }

  phoneNumberId() {
    return this.config.phoneNumberId || process.env[this.config.phoneNumberIdEnv || 'WHATSAPP_PHONE_NUMBER_ID'];
  }

  normalizeInbound(raw = {}) {
    const value = raw.entry?.[0]?.changes?.[0]?.value || raw;
    const message = value.messages?.[0] || raw.message || {};
    return {
      type: 'channel.message',
      channel: this.id,
      conversationId: message.from || value.contacts?.[0]?.wa_id,
      senderId: message.from || value.contacts?.[0]?.wa_id,
      text: message.text?.body || raw.text || '',
      payload: raw,
      priority: 'normal'
    };
  }

  async send(message) {
    const token = this.token();
    const phoneNumberId = this.phoneNumberId();
    if (!token) throw new Error('Missing WhatsApp Cloud access token');
    if (!phoneNumberId) throw new Error('Missing WhatsApp Cloud phone number id');
    const to = message.recipientId || message.conversationId;
    if (!to) throw new Error('WhatsApp send requires recipientId or conversationId');
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message.text } })
    });
    if (!response.ok) throw new Error(`WhatsApp Cloud returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return { ok: true, channel: this.id, provider: 'whatsapp-cloud', raw: await response.json().catch(() => null) };
  }
}

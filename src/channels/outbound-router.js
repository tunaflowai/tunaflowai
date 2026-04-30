import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, now } from '../core/utils.js';

export class OutboundRouter {
  constructor({ channelRegistry = null, dataDir = null, auditLog = null } = {}) {
    this.channelRegistry = channelRegistry;
    this.dataDir = dataDir;
    this.auditLog = auditLog;
  }

  async send({ channel, conversationId, recipientId, text, event = null, metadata = {} }) {
    const message = {
      channel: channel || event?.channel || 'webhook',
      conversationId: conversationId || event?.conversationId || event?.chatId || event?.payload?.chatId,
      recipientId: recipientId || event?.senderId || event?.payload?.senderId || event?.payload?.from,
      text,
      metadata,
      createdAt: now()
    };

    let result;
    if (this.channelRegistry?.get(message.channel)) {
      result = await this.channelRegistry.send(message);
    } else {
      result = await this.writeFallback(message);
    }

    if (this.auditLog) await this.auditLog.record('channel.send', { message: { ...message, text: truncate(message.text) }, result });
    return result;
  }

  async writeFallback(message) {
    const outboundDir = path.join(this.dataDir || '.tunaflow', 'outbound');
    await ensureDir(outboundDir);
    const line = JSON.stringify(message);
    await fs.appendFile(path.join(outboundDir, 'replies.jsonl'), `${line}\n`, 'utf8');
    console.log(`[TunaFlow reply:${message.channel}] ${message.text || ''}`);
    return { ok: true, channel: message.channel, fallback: true, path: path.join(outboundDir, 'replies.jsonl') };
  }
}

function truncate(text) {
  if (!text || text.length <= 300) return text || '';
  return `${text.slice(0, 300)}...`;
}

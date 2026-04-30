import crypto from 'node:crypto';

export function verifyHmacSha256({ secret, rawBody, header, prefix = '' }) {
  if (!secret) return { ok: true, skipped: true, reason: 'No secret configured' };
  if (!header) return { ok: false, error: 'Missing signature header' };
  const expected = `${prefix}${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return safeEqual(String(header), expected) ? { ok: true } : { ok: false, error: 'Invalid HMAC signature' };
}

export function verifySlackSignature({ signingSecret, rawBody, headers, toleranceSeconds = 300 }) {
  if (!signingSecret) return { ok: true, skipped: true, reason: 'No Slack signing secret configured' };
  const timestamp = headers['x-slack-request-timestamp'];
  const signature = headers['x-slack-signature'];
  if (!timestamp || !signature) return { ok: false, error: 'Missing Slack signature headers' };
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > toleranceSeconds) return { ok: false, error: 'Slack timestamp outside tolerance' };
  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto.createHmac('sha256', signingSecret).update(base).digest('hex')}`;
  return safeEqual(signature, expected) ? { ok: true } : { ok: false, error: 'Invalid Slack signature' };
}

export function verifyTelegramSecret({ expected, headers }) {
  if (!expected) return { ok: true, skipped: true, reason: 'No Telegram webhook secret configured' };
  const received = headers['x-telegram-bot-api-secret-token'];
  return safeEqual(String(received || ''), String(expected)) ? { ok: true } : { ok: false, error: 'Invalid Telegram webhook secret token' };
}

export function verifyDiscordSignature({ publicKeyHex, rawBody, headers }) {
  if (!publicKeyHex) return { ok: true, skipped: true, reason: 'No Discord public key configured' };
  const signatureHex = headers['x-signature-ed25519'];
  const timestamp = headers['x-signature-timestamp'];
  if (!signatureHex || !timestamp) return { ok: false, error: 'Missing Discord signature headers' };
  try {
    const der = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyHex, 'hex')]);
    const key = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
    const ok = crypto.verify(null, Buffer.from(`${timestamp}${rawBody}`), key, Buffer.from(signatureHex, 'hex'));
    return ok ? { ok: true } : { ok: false, error: 'Invalid Discord signature' };
  } catch (error) {
    return { ok: false, error: `Discord signature verification failed: ${error.message}` };
  }
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

import crypto from 'node:crypto';

export function verifySlackSignature({ signingSecret, rawBody, headers, toleranceSeconds = 300 }) {
  if (!signingSecret) return { ok: false, reason: 'Missing Slack signing secret' };
  const timestamp = header(headers, 'x-slack-request-timestamp');
  const signature = header(headers, 'x-slack-signature');
  if (!timestamp || !signature) return { ok: false, reason: 'Missing Slack signature headers' };
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > toleranceSeconds) return { ok: false, reason: 'Slack signature timestamp is outside tolerance' };
  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto.createHmac('sha256', signingSecret).update(base).digest('hex')}`;
  return { ok: timingSafeEqual(signature, expected), reason: 'Slack HMAC verification failed' };
}

export function verifyWhatsAppSignature({ appSecret, rawBody, headers }) {
  if (!appSecret) return { ok: false, reason: 'Missing WhatsApp app secret' };
  const signature = header(headers, 'x-hub-signature-256');
  if (!signature) return { ok: false, reason: 'Missing x-hub-signature-256 header' };
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  return { ok: timingSafeEqual(signature, expected), reason: 'WhatsApp HMAC verification failed' };
}

export function verifyTelegramSecretToken({ expectedToken, headers }) {
  if (!expectedToken) return { ok: true, reason: 'No Telegram secret token configured' };
  const received = header(headers, 'x-telegram-bot-api-secret-token');
  return { ok: timingSafeEqual(received || '', expectedToken), reason: 'Telegram secret token verification failed' };
}

export function verifyDiscordSignature({ publicKey, rawBody, headers }) {
  if (!publicKey) return { ok: false, reason: 'Missing Discord public key' };
  const signature = header(headers, 'x-signature-ed25519');
  const timestamp = header(headers, 'x-signature-timestamp');
  if (!signature || !timestamp) return { ok: false, reason: 'Missing Discord signature headers' };
  try {
    const keyObject = ed25519PublicKeyFromHex(publicKey);
    const ok = crypto.verify(null, Buffer.from(`${timestamp}${rawBody}`), keyObject, Buffer.from(signature, 'hex'));
    return { ok, reason: ok ? 'ok' : 'Discord Ed25519 verification failed' };
  } catch (error) {
    return { ok: false, reason: `Discord signature verification error: ${error.message}` };
  }
}

export function header(headers = {}, name) {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === lower) return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

function timingSafeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function ed25519PublicKeyFromHex(hex) {
  const raw = Buffer.from(String(hex).replace(/^0x/, ''), 'hex');
  if (raw.length !== 32) throw new Error('Discord public key must be 32 bytes hex');
  const prefix = Buffer.from('302a300506032b6570032100', 'hex');
  return crypto.createPublicKey({ key: Buffer.concat([prefix, raw]), format: 'der', type: 'spki' });
}

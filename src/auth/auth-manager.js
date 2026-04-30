import crypto from 'node:crypto';
import { now } from '../core/utils.js';

export class AuthManager {
  constructor({ config = {}, auditLog = null } = {}) {
    this.config = {
      enabled: config.enabled === true,
      password: config.password || null,
      passwordEnv: config.passwordEnv || 'TUNAFLOW_DASHBOARD_PASSWORD',
      sessionSecret: config.sessionSecret || null,
      sessionSecretEnv: config.sessionSecretEnv || 'TUNAFLOW_SESSION_SECRET',
      cookieName: config.cookieName || 'tunaflow_session',
      ttlMs: Number(config.ttlMs || 1000 * 60 * 60 * 12)
    };
    this.auditLog = auditLog;
  }

  enabled() {
    return Boolean(this.config.enabled || this.password());
  }

  password() {
    return this.config.password || process.env[this.config.passwordEnv] || null;
  }

  secret() {
    return this.config.sessionSecret || process.env[this.config.sessionSecretEnv] || process.env.TUNAFLOW_API_TOKEN || 'tunaflow-dev-session-secret';
  }

  status() {
    return {
      enabled: this.enabled(),
      passwordConfigured: Boolean(this.password()),
      cookieName: this.config.cookieName,
      ttlMs: this.config.ttlMs
    };
  }

  async login(password, metadata = {}) {
    const expected = this.password();
    if (!expected) throw new Error('Dashboard password is not configured');
    if (!safeEqual(String(password || ''), String(expected))) {
      if (this.auditLog) await this.auditLog.record('auth.login_failed', metadata);
      throw new Error('Invalid dashboard password');
    }
    const expiresAt = Date.now() + this.config.ttlMs;
    const payload = Buffer.from(JSON.stringify({ exp: expiresAt, iat: Date.now() })).toString('base64url');
    const sig = sign(payload, this.secret());
    if (this.auditLog) await this.auditLog.record('auth.login_success', { at: now(), metadata });
    return { cookie: `${payload}.${sig}`, expiresAt };
  }

  verifyCookie(cookieHeader = '') {
    if (!this.enabled()) return true;
    const cookie = parseCookie(cookieHeader)[this.config.cookieName];
    if (!cookie || !cookie.includes('.')) return false;
    const [payload, sig] = cookie.split('.', 2);
    if (!safeEqual(sig, sign(payload, this.secret()))) return false;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      return Number(data.exp) > Date.now();
    } catch (_) {
      return false;
    }
  }

  cookieHeader(cookie, expiresAt) {
    const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    return `${this.config.cookieName}=${cookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
  }

  clearCookieHeader() {
    return `${this.config.cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
  }
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function parseCookie(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

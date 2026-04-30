import crypto from 'node:crypto';

export class DashboardAuth {
  constructor({ config = {}, auditLog = null } = {}) {
    this.config = config || {};
    this.auditLog = auditLog;
    this.passwordEnv = this.config.passwordEnv || 'TUNAFLOW_DASHBOARD_PASSWORD';
    this.secretEnv = this.config.secretEnv || 'TUNAFLOW_DASHBOARD_SECRET';
    this.cookieName = this.config.cookieName || 'tunaflow_session';
    this.ttlMs = Number(this.config.ttlMs || 12 * 60 * 60 * 1000);
  }
  enabled() { return Boolean(process.env[this.passwordEnv] || this.config.password); }
  password() { return process.env[this.passwordEnv] || this.config.password || null; }
  secret() { return process.env[this.secretEnv] || this.config.secret || process.env[this.passwordEnv] || 'tunaflow-local-dashboard-secret'; }
  verifyPassword(password) { const expected = this.password(); if (!expected) return true; return safeEqual(String(password || ''), String(expected)); }
  createCookie(metadata = {}) { const expires = Date.now() + this.ttlMs; const payload = Buffer.from(JSON.stringify({ expires, metadata })).toString('base64url'); const signature = sign(payload, this.secret()); return `${this.cookieName}=${payload}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(this.ttlMs / 1000)}`; }
  clearCookie() { return `${this.cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`; }
  verifyRequest(req) { if (!this.enabled()) return true; const cookie = parseCookies(req.headers.cookie || '')[this.cookieName]; if (!cookie) return false; const [payload, signature] = cookie.split('.'); if (!payload || !signature) return false; if (!safeEqual(signature, sign(payload, this.secret()))) return false; try { const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); return Number(parsed.expires) > Date.now(); } catch { return false; } }
}

export function renderLoginPage({ error = null } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>TunaFlowAI Login</title><style>body{font-family:system-ui;margin:0;background:#0d1117;color:#e6edf3;display:grid;place-items:center;min-height:100vh}.card{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px #0006}input,button{width:100%;padding:12px;border-radius:10px;border:1px solid #30363d;background:#0d1117;color:#e6edf3;margin-top:10px}button{background:#238636;border-color:#238636;font-weight:700}.err{color:#ff7b72}</style></head><body><form class="card" method="post" action="/dashboard/login"><h1>TunaFlowAI</h1><p>Dashboard is protected. Enter the local dashboard password.</p>${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}<input type="password" name="password" placeholder="Dashboard password" autofocus><button type="submit">Login</button></form></body></html>`;
}
function sign(payload, secret) { return crypto.createHmac('sha256', secret).update(payload).digest('base64url'); }
function parseCookies(header) { const out = {}; for (const part of String(header || '').split(';')) { const idx = part.indexOf('='); if (idx === -1) continue; out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim(); } return out; }
function safeEqual(a, b) { const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b)); if (aa.length !== bb.length) return false; return crypto.timingSafeEqual(aa, bb); }
function escapeHtml(text) { return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

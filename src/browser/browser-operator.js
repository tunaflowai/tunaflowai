import { trimToChars } from '../core/utils.js';

export class BrowserOperator {
  constructor({ config = {}, auditLog = null } = {}) {
    this.config = {
      maxTextChars: config.maxTextChars || 12000,
      userAgent: config.userAgent || 'TunaFlowAI/0.5 (+https://github.com/tunaflowai/tunaflowai)',
      enableSideEffects: config.enableSideEffects === true
    };
    this.auditLog = auditLog;
  }

  async fetchPage({ url, method = 'GET', headers = {}, body = null, maxChars = null } = {}) {
    if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('browser_fetch_page requires an http(s) URL');
    const response = await fetch(url, {
      method,
      headers: { 'user-agent': this.config.userAgent, ...headers },
      body: body ? String(body) : undefined
    });
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    const extractedText = extractReadableText(text, contentType);
    const result = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      contentType,
      title: extractTitle(text),
      text: trimToChars(extractedText, maxChars || this.config.maxTextChars),
      rawChars: text.length
    };
    if (this.auditLog) await this.auditLog.record('browser.fetch_page', { url, status: response.status, contentType, rawChars: text.length });
    return result;
  }

  async sideEffect(action, args = {}) {
    if (!this.config.enableSideEffects) {
      return {
        ok: false,
        needsBrowserDriver: true,
        action,
        reason: 'Browser side-effect automation is gated. Enable browser.enableSideEffects and attach a browser driver before executing clicks, typing, or form submission.'
      };
    }
    return { ok: false, action, reason: 'No browser driver is attached in this dependency-free runtime.' };
  }
}

function extractTitle(html) {
  const match = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].replace(/\s+/g, ' ').trim()) : null;
}

function extractReadableText(input, contentType = '') {
  if (!/html/i.test(contentType)) return input;
  return decodeHtml(String(input || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function decodeHtml(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

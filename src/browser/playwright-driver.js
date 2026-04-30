import { trimToChars } from '../core/utils.js';

export class PlaywrightBrowserDriver {
  constructor({ config = {}, auditLog = null } = {}) {
    this.config = {
      browser: config.browser || 'chromium',
      headless: config.headless !== false,
      storageState: config.storageState || null,
      timeoutMs: Number(config.timeoutMs || 30000),
      maxTextChars: Number(config.maxTextChars || 12000)
    };
    this.auditLog = auditLog;
    this.playwright = null;
    this.browser = null;
    this.context = null;
  }

  async init() {
    this.playwright = await optionalImport('playwright');
    const launcher = this.playwright[this.config.browser] || this.playwright.chromium;
    this.browser = await launcher.launch({ headless: this.config.headless });
    this.context = await this.browser.newContext(this.config.storageState ? { storageState: this.config.storageState } : {});
    return { ok: true, browser: this.config.browser, headless: this.config.headless };
  }

  async close() {
    await this.context?.close?.().catch(() => {});
    await this.browser?.close?.().catch(() => {});
    this.context = null;
    this.browser = null;
  }

  async fetchPage({ url, maxChars } = {}) {
    const page = await this.page();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeoutMs });
    const title = await page.title().catch(() => null);
    const text = await page.locator('body').innerText({ timeout: this.config.timeoutMs }).catch(() => '');
    if (this.auditLog) await this.auditLog.record('browser.playwright.fetch_page', { url, title });
    return { ok: true, url: page.url(), title, text: trimToChars(text, maxChars || this.config.maxTextChars) };
  }

  async act({ action, selector, text, value, url, waitFor = 'domcontentloaded' } = {}) {
    const page = await this.page();
    if (url) await page.goto(url, { waitUntil: waitFor, timeout: this.config.timeoutMs });
    if (action === 'click') await page.click(selector, { timeout: this.config.timeoutMs });
    else if (action === 'fill') await page.fill(selector, String(text ?? value ?? ''), { timeout: this.config.timeoutMs });
    else if (action === 'type') await page.type(selector, String(text ?? value ?? ''), { timeout: this.config.timeoutMs });
    else if (action === 'press') await page.press(selector, String(value || 'Enter'), { timeout: this.config.timeoutMs });
    else if (action === 'screenshot') return { ok: true, path: await page.screenshot({ path: value || undefined, fullPage: true }) };
    else throw new Error(`Unknown Playwright action: ${action}`);
    if (this.auditLog) await this.auditLog.record('browser.playwright.act', { action, selector, url: page.url() });
    return { ok: true, action, url: page.url() };
  }

  async page() {
    if (!this.context) await this.init();
    const pages = this.context.pages();
    return pages[0] || await this.context.newPage();
  }
}

export async function optionalImport(name) {
  try { return await import(name); }
  catch (error) {
    throw new Error(`Optional package '${name}' is not installed. Run: npm install ${name}`);
  }
}

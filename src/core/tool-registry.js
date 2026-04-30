import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, limitNumber, safeJoin, trimToChars } from './utils.js';

export class ToolRegistry {
  constructor({ workspace, auditLog = null, config = {}, sandboxRunner = null, browserOperator = null, secretVault = null }) {
    this.workspace = path.resolve(workspace || process.cwd());
    this.auditLog = auditLog;
    this.sandboxRunner = sandboxRunner;
    this.browserOperator = browserOperator;
    this.secretVault = secretVault;
    this.config = {
      commandAllowlist: config.commandAllowlist || ['node', 'npm', 'pnpm', 'yarn', 'git', 'python', 'python3'],
      commandDenyPatterns: config.commandDenyPatterns || ['git push', 'git reset --hard', 'npm publish', 'pnpm publish', 'yarn publish', 'rm -rf', 'curl | sh', 'wget | sh'],
      maxCommandOutputChars: config.maxCommandOutputChars || 6000,
      defaultCommandTimeoutMs: config.defaultCommandTimeoutMs || 30000,
      marketData: config.marketData || {},
      telegram: config.telegram || {}
    };
    this.tools = new Map();
    this.registerDefaults();
  }

  register(tool) {
    if (!tool?.name) throw new Error('Tool requires a name');
    if (!['low', 'medium', 'high', 'critical'].includes(tool.risk)) throw new Error(`Tool ${tool.name} has invalid risk level`);
    this.tools.set(tool.name, tool);
  }

  get(name) { return this.tools.get(name); }

  list() { return [...this.tools.values()].map(({ execute, ...meta }) => meta); }

  async execute(action, ctx = {}) {
    const tool = this.get(action.tool);
    if (!tool) throw new Error(`Unknown tool: ${action.tool}`);
    validateAction(tool, action);
    if (this.auditLog) await this.auditLog.record('tool.start', { tool: tool.name, args: redactToolArgs(action.args || {}), risk: tool.risk });
    const startedAt = Date.now();
    try {
      const result = await tool.execute(action.args || {}, { ...ctx, workspace: this.workspace });
      if (this.auditLog) await this.auditLog.record('tool.success', { tool: tool.name, latencyMs: Date.now() - startedAt, result: redactToolResult(result) });
      return result;
    } catch (error) {
      if (this.auditLog) await this.auditLog.record('tool.failure', { tool: tool.name, latencyMs: Date.now() - startedAt, error: error.message });
      throw error;
    }
  }

  registerDefaults() {
    this.registerMessagingTools();
    this.registerFileTools();
    this.registerMarketTools();
    this.registerFinanceTools();
    this.registerFnbTools();
    this.registerContentTools();
    this.registerBackOfficeTools();
    this.registerCustomerTools();
    this.registerDevOpsTools();
    this.registerBrowserTools();
    this.registerSystemTools();
  }

  registerMessagingTools() {
    this.register({
      name: 'send_reply',
      description: 'Send a reply to the current user/channel. Uses channel routing when available; otherwise writes to stdout and an outbound log.',
      risk: 'low',
      schema: { required: ['message'], properties: { message: 'string' } },
      execute: async ({ message, channel, conversationId, recipientId }, ctx) => {
        if (ctx.outboundRouter) {
          const result = await ctx.outboundRouter.send({ channel, conversationId, recipientId, text: message || '', event: ctx.event, metadata: { runId: ctx.runId, approvalId: ctx.approvalId } });
          return { ok: true, message, delivery: result };
        }
        const outboundDir = path.join(ctx.dataDir || path.join(ctx.workspace, '.tunaflow'), 'outbound');
        await ensureDir(outboundDir);
        const line = `[TunaFlow reply] ${message || ''}`;
        console.log(line);
        await fs.appendFile(path.join(outboundDir, 'replies.log'), `${line}\n`, 'utf8');
        return { ok: true, message };
      }
    });

    this.register({
      name: 'send_telegram_alert',
      description: 'Send a Telegram alert using TELEGRAM_BOT_TOKEN and chat id. Requires configured token and recipient.',
      risk: 'medium',
      schema: { required: ['message'], properties: { message: 'string', chatId: 'string?' } },
      execute: async ({ message, chatId }, ctx) => {
        const token = this.config.telegram.token || process.env[this.config.telegram.tokenEnv || 'TELEGRAM_BOT_TOKEN'];
        const targetChatId = chatId || this.config.telegram.chatId || process.env[this.config.telegram.chatIdEnv || 'TELEGRAM_CHAT_ID'];
        if (!token) throw new Error('Missing Telegram bot token');
        if (!targetChatId) throw new Error('Missing Telegram chat id');
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: targetChatId, text: message })
        });
        if (!response.ok) throw new Error(`Telegram returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
        return { ok: true, channel: 'telegram', chatId: targetChatId, raw: await response.json().catch(() => null) };
      }
    });
  }

  registerFileTools() {
    this.register({ name: 'inspect_state', description: 'Return the current compact work state.', risk: 'low', schema: { required: [], properties: {} }, execute: async (_args, ctx) => ({ ok: true, state: ctx.stateEngine?.getState?.() || null }) });

    this.register({
      name: 'list_files',
      description: 'List files in the workspace with a shallow recursive scan.',
      risk: 'low',
      schema: { required: [], properties: { path: 'string?', maxEntries: 'number?' } },
      execute: async ({ path: rel = '.', maxEntries = 80 }, ctx) => {
        const start = safeJoin(ctx.workspace, rel);
        const files = [];
        await walk(start, ctx.workspace, files, limitNumber(maxEntries, 80, { min: 1, max: 500 }));
        return { ok: true, files };
      }
    });

    this.register({
      name: 'read_file',
      description: 'Read a text file inside the workspace.',
      risk: 'low',
      schema: { required: ['path'], properties: { path: 'string', maxChars: 'number?' } },
      execute: async ({ path: rel, maxChars = 12000 }, ctx) => {
        const file = safeJoin(ctx.workspace, rel);
        const text = await fs.readFile(file, 'utf8');
        return { ok: true, path: rel, text: trimToChars(text, limitNumber(maxChars, 12000, { min: 1, max: 120000 })) };
      }
    });

    this.register({ name: 'write_file', description: 'Write a text file inside the workspace. Requires approval by default.', risk: 'medium', schema: { required: ['path', 'content'], properties: { path: 'string', content: 'string' } }, execute: async ({ path: rel, content }, ctx) => { const file = safeJoin(ctx.workspace, rel); await ensureDir(path.dirname(file)); await fs.writeFile(file, content || '', 'utf8'); return { ok: true, path: rel, bytes: Buffer.byteLength(content || '') }; } });
    this.register({ name: 'append_file', description: 'Append text to a file inside the workspace. Requires approval by default.', risk: 'medium', schema: { required: ['path', 'content'], properties: { path: 'string', content: 'string' } }, execute: async ({ path: rel, content }, ctx) => { const file = safeJoin(ctx.workspace, rel); await ensureDir(path.dirname(file)); await fs.appendFile(file, content || '', 'utf8'); return { ok: true, path: rel, bytes: Buffer.byteLength(content || '') }; } });
    this.register({ name: 'edit_file', description: 'Replace text in a workspace file. Requires approval by default.', risk: 'medium', schema: { required: ['path', 'search', 'replace'], properties: { path: 'string', search: 'string', replace: 'string', all: 'boolean?' } }, execute: async ({ path: rel, search, replace, all = false }, ctx) => { const file = safeJoin(ctx.workspace, rel); const text = await fs.readFile(file, 'utf8'); if (!search) throw new Error('edit_file requires a non-empty search string'); const updated = all ? text.split(search).join(replace || '') : text.replace(search, replace || ''); if (updated === text) throw new Error('No matching text found for edit_file'); await fs.writeFile(file, updated, 'utf8'); return { ok: true, path: rel, changed: true }; } });

    this.register({
      name: 'read_spreadsheet',
      description: 'Read CSV/TSV/JSON spreadsheet-like files from the workspace. XLSX requires a future optional adapter.',
      risk: 'low',
      schema: { required: ['path'], properties: { path: 'string', delimiter: 'string?', maxRows: 'number?' } },
      execute: async ({ path: rel, delimiter = null, maxRows = 200 }, ctx) => {
        const file = safeJoin(ctx.workspace, rel);
        if (/\.xlsx$/i.test(rel)) return { ok: false, path: rel, error: 'XLSX parsing is not included in the dependency-free core. Export to CSV or add an xlsx plugin.' };
        const raw = await fs.readFile(file, 'utf8');
        if (/\.json$/i.test(rel)) return { ok: true, path: rel, rows: JSON.parse(raw).slice?.(0, maxRows) || JSON.parse(raw) };
        const sep = delimiter || (raw.includes('\t') ? '\t' : ',');
        return { ok: true, path: rel, rows: parseDelimited(raw, sep).slice(0, maxRows) };
      }
    });

    this.register({
      name: 'read_pdf_text',
      description: 'Extract lightweight text from a text-based PDF or invoice-like text file. For scanned PDFs, add an OCR/plugin adapter.',
      risk: 'low',
      schema: { required: ['path'], properties: { path: 'string', maxChars: 'number?' } },
      execute: async ({ path: rel, maxChars = 12000 }, ctx) => {
        const file = safeJoin(ctx.workspace, rel);
        const buf = await fs.readFile(file);
        const text = buf.toString('latin1').replace(/\x00/g, '').replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ÿ]+/g, ' ').replace(/\s+/g, ' ').trim();
        return { ok: true, path: rel, text: trimToChars(text, maxChars), warning: /\.pdf$/i.test(rel) ? 'Lightweight extraction only; use a PDF plugin for reliable parsing.' : undefined };
      }
    });
  }

  registerMarketTools() {
    this.register({
      name: 'fetch_market_data',
      description: 'Fetch latest market data for crypto via CoinGecko simple price or stocks via Stooq CSV when network is available.',
      risk: 'low',
      schema: { required: ['asset'], properties: { asset: 'string', type: 'crypto|stock?', currency: 'string?' } },
      execute: async ({ asset, type = 'crypto', currency = 'usd' }) => {
        if (type === 'stock') {
          const symbol = String(asset).toLowerCase();
          const response = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`);
          const text = await response.text();
          return { ok: response.ok, type, asset, provider: 'stooq', data: parseDelimited(text, ',') };
        }
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(asset)}&vs_currencies=${encodeURIComponent(currency)}&include_24hr_change=true&include_24hr_vol=true`);
        const data = await response.json();
        return { ok: response.ok, type: 'crypto', asset, currency, provider: 'coingecko', data };
      }
    });
    this.register({ name: 'fetch_asset_price', description: 'Alias-friendly asset price fetcher for market analyst skills.', risk: 'low', schema: { required: ['asset'], properties: { asset: 'string', type: 'crypto|stock?', currency: 'string?' } }, execute: async (args) => this.get('fetch_market_data').execute(args, {}) });
  }

  registerFinanceTools() {
    this.register({ name: 'calculate_tax_ppn', description: 'Calculate Indonesian VAT/PPN or any percentage tax from transaction amounts.', risk: 'low', schema: { required: ['amounts'], properties: { amounts: 'number[]', rate: 'number?' } }, execute: async ({ amounts, rate = 0.11 }) => { const values = asNumbers(amounts); const subtotal = values.reduce((a, b) => a + b, 0); const tax = subtotal * Number(rate); return { ok: true, subtotal, rate: Number(rate), tax, total: subtotal + tax }; } });
    this.register({ name: 'generate_financial_summary', description: 'Generate a deterministic financial summary from rows or amounts.', risk: 'low', schema: { required: [], properties: { rows: 'array?', amountField: 'string?', revenueField: 'string?', expenseField: 'string?' } }, execute: async ({ rows = [], amountField = 'amount', revenueField = 'revenue', expenseField = 'expense' }) => { const list = Array.isArray(rows) ? rows : []; let revenue = 0, expense = 0, count = 0; for (const row of list) { count += 1; if (row[revenueField] != null) revenue += Number(row[revenueField]) || 0; else if (row[amountField] != null && Number(row[amountField]) >= 0) revenue += Number(row[amountField]) || 0; if (row[expenseField] != null) expense += Number(row[expenseField]) || 0; else if (row[amountField] != null && Number(row[amountField]) < 0) expense += Math.abs(Number(row[amountField]) || 0); } return { ok: true, count, revenue, expense, grossProfit: revenue - expense }; } });
    this.register({ name: 'generate_invoice', description: 'Generate a simple invoice JSON/text file in the workspace. Requires approval by default.', risk: 'medium', schema: { required: ['path', 'customer', 'items'], properties: { path: 'string', customer: 'string', items: 'array', taxRate: 'number?' } }, execute: async ({ path: rel, customer, items, taxRate = 0.11 }, ctx) => { const rows = Array.isArray(items) ? items : []; const subtotal = rows.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)), 0); const tax = subtotal * Number(taxRate); const invoice = { customer, items: rows, subtotal, taxRate, tax, total: subtotal + tax, generatedAt: new Date().toISOString() }; const file = safeJoin(ctx.workspace, rel); await ensureDir(path.dirname(file)); await fs.writeFile(file, `${JSON.stringify(invoice, null, 2)}\n`, 'utf8'); return { ok: true, path: rel, invoice }; } });
  }

  registerFnbTools() {
    this.register({ name: 'check_inventory_level', description: 'Check inventory levels from a local JSON/CSV file and return low-stock items.', risk: 'low', schema: { required: ['path'], properties: { path: 'string', thresholdField: 'string?', qtyField: 'string?' } }, execute: async ({ path: rel, thresholdField = 'min', qtyField = 'qty' }, ctx) => { const rows = await readRows(ctx.workspace, rel); const low = rows.filter((row) => Number(row[qtyField]) <= Number(row[thresholdField] ?? 0)); return { ok: true, path: rel, count: rows.length, lowStock: low }; } });
    this.register({ name: 'send_restock_warning', description: 'Prepare or send a restock warning. Uses outbound log by default.', risk: 'medium', schema: { required: ['items'], properties: { items: 'array', message: 'string?' } }, execute: async ({ items, message }, ctx) => { const text = message || `Restock warning: ${JSON.stringify(items)}`; return this.get('send_reply').execute({ message: text }, ctx); } });
    this.register({ name: 'summarize_daily_sales', description: 'Summarize daily sales from local CSV/JSON POS export.', risk: 'low', schema: { required: ['path'], properties: { path: 'string', amountField: 'string?', itemField: 'string?' } }, execute: async ({ path: rel, amountField = 'amount', itemField = 'item' }, ctx) => { const rows = await readRows(ctx.workspace, rel); const total = rows.reduce((sum, row) => sum + Number(row[amountField] || 0), 0); const items = {}; for (const row of rows) items[row[itemField] || 'unknown'] = (items[row[itemField] || 'unknown'] || 0) + 1; return { ok: true, path: rel, orders: rows.length, total, topItems: Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([item, count]) => ({ item, count })) }; } });
  }

  registerContentTools() {
    this.register({ name: 'fetch_video_metrics', description: 'Fetch YouTube video metrics with YOUTUBE_API_KEY when configured.', risk: 'low', schema: { required: ['videoId'], properties: { videoId: 'string' } }, execute: async ({ videoId }) => { const key = process.env.YOUTUBE_API_KEY; if (!key) throw new Error('Missing YOUTUBE_API_KEY'); const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(key)}`); const data = await response.json(); return { ok: response.ok, videoId, data }; } });
    this.register({ name: 'generate_metadata_tags', description: 'Generate deterministic metadata tags/hashtags for content drafts.', risk: 'low', schema: { required: ['title'], properties: { title: 'string', genre: 'string?', audience: 'string?' } }, execute: async ({ title, genre = '', audience = '' }) => { const base = `${title} ${genre} ${audience}`.toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 2); const unique = [...new Set([...base, genre, 'music', 'release', 'official'].filter(Boolean))].slice(0, 20); return { ok: true, tags: unique, hashtags: unique.map((tag) => `#${tag.replace(/[^a-z0-9]/g, '')}`) }; } });
    this.register({ name: 'auto_reply_comments', description: 'Draft replies for comments. Does not publish automatically.', risk: 'low', schema: { required: ['comments'], properties: { comments: 'array' } }, execute: async ({ comments }) => ({ ok: true, drafts: (Array.isArray(comments) ? comments : []).slice(0, 50).map((comment, i) => ({ index: i, original: comment, draft: 'Thanks for listening and sharing your thoughts!' })) }) });
  }

  registerBackOfficeTools() {
    this.register({ name: 'extract_invoice_pdf', description: 'Extract invoice-like fields from text/PDF-light content.', risk: 'low', schema: { required: ['path'], properties: { path: 'string' } }, execute: async ({ path: rel }, ctx) => { const result = await this.get('read_pdf_text').execute({ path: rel, maxChars: 20000 }, ctx); const text = result.text || ''; return { ok: true, path: rel, fields: extractInvoiceFields(text), text: trimToChars(text, 4000), warning: result.warning }; } });
    this.register({ name: 'update_spreadsheet', description: 'Append a row to a local CSV file. Requires approval by default.', risk: 'medium', schema: { required: ['path', 'row'], properties: { path: 'string', row: 'object' } }, execute: async ({ path: rel, row }, ctx) => { const file = safeJoin(ctx.workspace, rel); await ensureDir(path.dirname(file)); const exists = await fs.stat(file).then(() => true).catch(() => false); const keys = Object.keys(row || {}); if (!exists) await fs.writeFile(file, `${keys.join(',')}\n`, 'utf8'); await fs.appendFile(file, `${keys.map((key) => csvEscape(row[key])).join(',')}\n`, 'utf8'); return { ok: true, path: rel, columns: keys.length }; } });
    this.register({ name: 'sort_important_emails', description: 'Sort email-like records by importance using simple deterministic rules.', risk: 'low', schema: { required: ['emails'], properties: { emails: 'array' } }, execute: async ({ emails }) => { const urgent = ['urgent', 'invoice', 'payment', 'complaint', 'overdue', 'refund']; return { ok: true, important: (Array.isArray(emails) ? emails : []).filter((email) => urgent.some((word) => JSON.stringify(email).toLowerCase().includes(word))).slice(0, 50) }; } });
  }

  registerCustomerTools() {
    this.register({ name: 'query_faq_database', description: 'Search a local FAQ JSON/CSV/Markdown file for matching answers.', risk: 'low', schema: { required: ['path', 'query'], properties: { path: 'string', query: 'string' } }, execute: async ({ path: rel, query }, ctx) => { const file = safeJoin(ctx.workspace, rel); const raw = await fs.readFile(file, 'utf8'); const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean); const lines = raw.split('\n').filter((line) => terms.some((term) => line.toLowerCase().includes(term))).slice(0, 20); return { ok: true, matches: lines }; } });
    this.register({ name: 'check_order_status', description: 'Check order status from a local JSON/CSV database.', risk: 'low', schema: { required: ['path', 'orderId'], properties: { path: 'string', orderId: 'string' } }, execute: async ({ path: rel, orderId }, ctx) => { const rows = await readRows(ctx.workspace, rel); const found = rows.find((row) => String(row.orderId || row.id || row.order_id) === String(orderId)); return { ok: true, orderId, found: found || null }; } });
    this.register({ name: 'create_support_ticket', description: 'Create a support ticket JSON file in the workspace. Requires approval by default.', risk: 'medium', schema: { required: ['title', 'description'], properties: { title: 'string', description: 'string', priority: 'string?' } }, execute: async ({ title, description, priority = 'normal' }, ctx) => { const dir = safeJoin(ctx.workspace, '.tunaflow-support-tickets'); await ensureDir(dir); const id = `ticket_${Date.now()}`; const ticket = { id, title, description, priority, status: 'open', createdAt: new Date().toISOString() }; await fs.writeFile(path.join(dir, `${id}.json`), `${JSON.stringify(ticket, null, 2)}\n`, 'utf8'); return { ok: true, ticket }; } });
  }

  registerDevOpsTools() {
    this.register({ name: 'ping_service', description: 'Check whether an HTTP service responds.', risk: 'low', schema: { required: ['url'], properties: { url: 'string', timeoutMs: 'number?' } }, execute: async ({ url, timeoutMs = 8000 }) => { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), limitNumber(timeoutMs, 8000, { min: 1000, max: 30000 })); try { const response = await fetch(url, { method: 'GET', signal: controller.signal }); return { ok: response.ok, status: response.status, url }; } finally { clearTimeout(timer); } } });
    this.register({ name: 'restart_server', description: 'Restart a configured service via sandboxed command. High risk and approval-gated.', risk: 'high', schema: { required: ['command'], properties: { command: 'string', args: 'array?' } }, execute: async (args, ctx) => this.get('run_command').execute(args, ctx) });
    this.register({ name: 'run_database_backup', description: 'Copy a local database/file to a backup location. High risk and approval-gated.', risk: 'high', schema: { required: ['sourcePath', 'backupPath'], properties: { sourcePath: 'string', backupPath: 'string' } }, execute: async ({ sourcePath, backupPath }, ctx) => { const source = safeJoin(ctx.workspace, sourcePath); const dest = safeJoin(ctx.workspace, backupPath); await ensureDir(path.dirname(dest)); await fs.cp(source, dest, { recursive: true }); return { ok: true, sourcePath, backupPath }; } });
  }

  registerBrowserTools() {
    this.register({ name: 'browser_fetch', description: 'Fetch and summarize a web page with SSRF guards.', risk: 'low', schema: { required: ['url'], properties: { url: 'string', maxChars: 'number?' } }, execute: async (args) => { if (!this.browserOperator) throw new Error('Browser operator is not configured'); return this.browserOperator.fetchPage(args); } });
    this.register({ name: 'browser_http_request', description: 'Perform an HTTP request through the browser operator. Non-GET mutations require approval by policy.', risk: 'medium', schema: { required: ['url'], properties: { url: 'string', method: 'string?', body: 'string?' } }, execute: async (args) => { if (!this.browserOperator) throw new Error('Browser operator is not configured'); return this.browserOperator.fetchPage(args); } });
  }

  registerSystemTools() {
    this.register({
      name: 'run_command',
      description: 'Run an allowlisted command through the sandbox runner. High risk and approval-gated by default.',
      risk: 'high',
      schema: { required: ['command'], properties: { command: 'string', args: 'string[]?', timeoutMs: 'number?' } },
      execute: async ({ command, args = [], timeoutMs }, ctx) => {
        if (!this.sandboxRunner) throw new Error('Sandbox runner is not configured');
        return this.sandboxRunner.run({ command, args, timeoutMs });
      }
    });
  }
}

function validateAction(tool, action) {
  if (!action || typeof action !== 'object') throw new Error('Action must be an object');
  if (action.tool !== tool.name) throw new Error(`Action tool mismatch: expected ${tool.name}`);
  const args = action.args || {};
  for (const required of tool.schema?.required || []) {
    if (args[required] === undefined || args[required] === null) throw new Error(`Tool ${tool.name} requires argument: ${required}`);
  }
}

async function walk(dir, root, files, maxEntries, depth = 0) {
  if (files.length >= maxEntries || depth > 4) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (files.length >= maxEntries) break;
    if (['node_modules', '.git', '.tunaflow', '.tunaflow-demo', 'dist', 'coverage'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full) || '.';
    if (entry.isDirectory()) await walk(full, root, files, maxEntries, depth + 1);
    else files.push(rel);
  }
}

function parseDelimited(raw, sep = ',') {
  const lines = String(raw || '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0], sep);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, sep);
    return Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? '']));
  });
}

function splitCsvLine(line, sep) {
  const out = [];
  let cell = '', quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') { quoted = !quoted; continue; }
    if (char === sep && !quoted) { out.push(cell); cell = ''; continue; }
    cell += char;
  }
  out.push(cell);
  return out.map((item) => item.trim());
}

async function readRows(workspace, rel) {
  const file = safeJoin(workspace, rel);
  const raw = await fs.readFile(file, 'utf8');
  if (/\.json$/i.test(rel)) {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.rows || parsed.items || []);
  }
  return parseDelimited(raw, raw.includes('\t') ? '\t' : ',');
}

function asNumbers(value) {
  return (Array.isArray(value) ? value : [value]).map(Number).filter(Number.isFinite);
}

function extractInvoiceFields(text) {
  const amount = text.match(/(?:total|amount|jumlah|nominal)\D{0,20}([0-9][0-9.,]+)/i)?.[1] || null;
  const date = text.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/)?.[1] || null;
  const invoiceNo = text.match(/(?:invoice|inv|no\.?|number)\D{0,20}([A-Za-z0-9._/-]+)/i)?.[1] || null;
  return { invoiceNo, date, amount };
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function redactToolArgs(args) { return JSON.parse(JSON.stringify(args || {}, redactSecretValues)); }
function redactToolResult(result) { return JSON.parse(JSON.stringify(result || {}, redactSecretValues)); }
function redactSecretValues(key, value) { return /token|secret|password|apiKey/i.test(key) ? '[REDACTED]' : value; }

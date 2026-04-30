import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, limitNumber, safeJoin, trimToChars } from '../core/utils.js';

export function registerExtendedJobTools(registry) {
  const add = (name, description, risk, properties, execute, required = []) => {
    registry.register({ name, description, risk, schema: { required, properties }, execute });
  };

  add('fetch_ad_metrics', 'Import ad metrics from JSON/CSV or a configured ad platform adapter.', 'low', { path: 'string?', rows: 'array?' }, async (args, ctx) => ({ ok: true, metrics: summarizeAdMetrics(await rowsFromArgs(args, ctx)) }));
  add('analyze_keywords', 'Rank keywords from text, CSV rows, or supplied keyword candidates.', 'low', { text: 'string?', keywords: 'array?', rows: 'array?' }, async ({ text = '', keywords = [], rows = [] }) => ({ ok: true, keywords: rankKeywords({ text, keywords, rows }) }));
  add('generate_ad_copy', 'Generate lightweight ad copy variants from product, audience, and offer fields.', 'low', { product: 'string', audience: 'string?', offer: 'string?', tone: 'string?', count: 'number?' }, async ({ product, audience = 'customers', offer = '', tone = 'fresh', count = 5 }) => ({ ok: true, variants: Array.from({ length: limitNumber(count, 5, { min: 1, max: 10 }) }, (_, i) => `${product}: ${offer || 'a better choice'} for ${audience}. ${tone} angle ${i + 1}.`) }), ['product']);
  add('pause_losing_ads', 'Prepare a high-risk approval request to pause campaigns below performance thresholds.', 'high', { campaigns: 'array', minCtr: 'number?', maxCpc: 'number?' }, async ({ campaigns = [], minCtr = 0.01, maxCpc = 1 }) => ({ ok: true, approvalRequired: true, candidates: campaigns.filter((c) => Number(c.ctr || 0) < minCtr || Number(c.cpc || 0) > maxCpc) }), ['campaigns']);

  add('extract_resume_text', 'Extract text from a resume file. PDF extraction is lightweight; scanned documents require OCR on the PC.', 'low', { path: 'string', maxChars: 'number?' }, async ({ path: rel, maxChars = 16000 }, ctx) => readTextLike(rel, ctx, maxChars), ['path']);
  add('score_candidate', 'Score a candidate against a job requirement keyword list.', 'low', { resumeText: 'string', requirements: 'array', mustHave: 'array?' }, async ({ resumeText = '', requirements = [], mustHave = [] }) => scoreCandidate(resumeText, requirements, mustHave), ['resumeText', 'requirements']);
  add('send_notification', 'Send a notification through the current outbound channel or local reply log.', 'medium', { message: 'string', channel: 'string?' }, async ({ message, channel }, ctx) => registry.get('send_reply').execute({ message, channel }, ctx), ['message']);
  add('send_interview_invite', 'Draft or send an interview invitation through the outbound channel.', 'medium', { candidateName: 'string', contact: 'string?', schedule: 'string?', message: 'string?' }, async (args, ctx) => registry.get('send_reply').execute({ message: args.message || `Interview invitation for ${args.candidateName}: ${args.schedule || 'schedule to be confirmed'}`, recipientId: args.contact }, ctx), ['candidateName']);
  add('send_rejection_email', 'Draft or send a polite rejection message.', 'medium', { candidateName: 'string', contact: 'string?', reason: 'string?' }, async ({ candidateName, contact, reason }, ctx) => registry.get('send_reply').execute({ recipientId: contact, message: `Thank you, ${candidateName}. We appreciate your application. ${reason ? `Reason: ${reason}` : 'We will keep your profile for future opportunities.'}` }, ctx), ['candidateName']);

  add('clean_csv_data', 'Remove empty and duplicate rows from a CSV/TSV file or row array.', 'medium', { path: 'string?', outputPath: 'string?', rows: 'array?', delimiter: 'string?' }, async (args, ctx) => cleanCsvData(args, ctx));
  add('find_data_anomalies', 'Find numeric outliers in table rows using a simple z-score style threshold.', 'low', { rows: 'array?', path: 'string?', field: 'string', threshold: 'number?' }, async (args, ctx) => findAnomalies(args, ctx), ['field']);
  add('generate_chart_image', 'Generate a lightweight SVG bar or line chart without heavy plotting dependencies.', 'medium', { rows: 'array?', path: 'string?', xField: 'string?', yField: 'string', outputPath: 'string?', type: 'string?' }, async (args, ctx) => generateChartSvg(args, ctx), ['yField']);

  add('check_calendar_conflict', 'Check whether proposed calendar events overlap.', 'low', { events: 'array', proposed: 'object?' }, async ({ events = [], proposed = null }) => checkCalendarConflict(events, proposed), ['events']);
  add('schedule_meeting', 'Prepare a calendar event. Live calendar writes require a calendar API adapter and approval.', 'medium', { title: 'string', start: 'string', end: 'string', attendees: 'array?' }, async (args) => ({ ok: true, approvalRequired: true, event: args, mode: 'draft' }), ['title', 'start', 'end']);
  add('book_ticket_api', 'Prepare a travel booking request. Live purchase requires an adapter and explicit approval.', 'high', { origin: 'string', destination: 'string', date: 'string', passenger: 'string?' }, async (args) => ({ ok: true, approvalRequired: true, mode: 'draft-booking', request: args }), ['origin', 'destination', 'date']);

  add('check_overdue_tasks', 'Return tasks whose due date has passed and are not done.', 'low', { tasks: 'array' }, async ({ tasks = [] }) => ({ ok: true, overdue: tasks.filter((task) => isOverdue(task)) }), ['tasks']);
  add('ping_team_member', 'Send a polite task reminder through the outbound channel.', 'medium', { member: 'string', task: 'string', channel: 'string?' }, async ({ member, task, channel }, ctx) => registry.get('send_reply').execute({ channel, message: `Hi ${member}, task '${task}' is still open. Any blockers?` }, ctx), ['member', 'task']);
  add('generate_sprint_report', 'Summarize completed, blocked, and overdue sprint tasks.', 'low', { tasks: 'array' }, async ({ tasks = [] }) => sprintReport(tasks), ['tasks']);

  add('translate_document', 'Prepare document text for translation. Model-led translation should be run by the selected model.', 'low', { text: 'string?', path: 'string?', targetLanguage: 'string', style: 'string?' }, async (args, ctx) => translateDraft(args, ctx), ['targetLanguage']);
  add('proofread_text', 'Clean common spacing, punctuation, and typo issues in text.', 'low', { text: 'string' }, async ({ text }) => ({ ok: true, text: proofread(text) }), ['text']);
  add('format_to_markdown', 'Format plain text into readable Markdown sections and bullet points.', 'low', { text: 'string', title: 'string?' }, async ({ text, title }) => ({ ok: true, markdown: toMarkdown(text, title) }), ['text']);

  add('scrape_competitor_prices', 'Collect competitor price inputs from supplied rows or a scraper adapter. Does not bypass platform rules.', 'medium', { rows: 'array?', query: 'string?', adapter: 'string?' }, async ({ rows = [], query = '', adapter = '' }) => ({ ok: true, mode: rows.length ? 'provided-data' : 'adapter-required', query, adapter, prices: rows.map(normalizePriceRow) }));
  add('auto_update_stock', 'Prepare stock synchronization actions between POS and marketplace inventory.', 'high', { products: 'array', dryRun: 'boolean?' }, async ({ products = [], dryRun = true }) => ({ ok: true, dryRun, approvalRequired: !dryRun, updates: products.map((p) => ({ sku: p.sku || p.id, stock: Number(p.stock || p.qty || 0) })) }), ['products']);
  add('generate_product_description', 'Write a concise product or menu description from ingredients and selling points.', 'low', { name: 'string', ingredients: 'array?', tone: 'string?' }, async ({ name, ingredients = [], tone = 'appetizing' }) => ({ ok: true, description: `${name} made with ${ingredients.join(', ') || 'selected ingredients'}, written in a ${tone} style.` }), ['name']);
  add('process_refund_request', 'Validate refund evidence and prepare a high-risk approval decision.', 'high', { orderId: 'string', reason: 'string', evidence: 'array?' }, async (args) => ({ ok: true, approvalRequired: true, decision: 'review-required', request: args }), ['orderId', 'reason']);

  add('scan_risky_clauses', 'Scan contract text for risky clauses such as penalties, exclusivity, liability, IP transfer, and auto-renewal.', 'low', { text: 'string?', path: 'string?' }, async (args, ctx) => scanRiskyClauses(await textFromArgs(args, ctx)));
  add('compare_document_versions', 'Compare two document versions and show added or removed lines.', 'low', { oldText: 'string?', newText: 'string?', oldPath: 'string?', newPath: 'string?' }, async (args, ctx) => compareVersions(args, ctx));
  add('generate_standard_nda', 'Generate a standard mutual NDA draft for review by a lawyer.', 'medium', { disclosingParty: 'string', receivingParty: 'string', effectiveDate: 'string?', jurisdiction: 'string?', outputPath: 'string?' }, async (args, ctx) => generateNda(args, ctx), ['disclosingParty', 'receivingParty']);

  add('analyze_user_error_logs', 'Summarize application or POS error logs and group recurring failures.', 'low', { text: 'string?', path: 'string?' }, async (args, ctx) => analyzeLogs(await textFromArgs(args, ctx)));
  add('run_automated_tests', 'Run an allowlisted test command through the sandbox runner.', 'high', { command: 'string', args: 'array?' }, async (args, ctx) => registry.get('run_command').execute(args, ctx), ['command']);
  add('reset_user_password', 'Prepare a high-risk password reset request with verification metadata.', 'high', { userId: 'string', verified: 'boolean?', method: 'string?' }, async (args) => ({ ok: true, approvalRequired: true, request: args, allowed: Boolean(args.verified) }), ['userId']);

  add('search_web_articles', 'Use the browser/search adapter to collect research pages. Requires a configured browser operator for live web access.', 'low', { query: 'string', limit: 'number?' }, async ({ query, limit = 10 }) => ({ ok: false, adapterRequired: true, query, limit, commandHint: 'Use the browser/search connector or run a web research task from a connected channel.' }), ['query']);
  add('summarize_long_pdf', 'Extract and summarize a text-based PDF. Scanned PDFs require OCR or a PDF plugin on the PC.', 'low', { path: 'string', maxChars: 'number?' }, async ({ path: rel, maxChars = 20000 }, ctx) => ({ ok: true, ...(await readTextLike(rel, ctx, maxChars)), summaryHint: 'Send the extracted text to the selected model for a full summary.' }), ['path']);
  add('compile_research_report', 'Compile findings and sources into a Markdown research report.', 'medium', { topic: 'string', findings: 'array', outputPath: 'string?' }, async ({ topic, findings = [], outputPath }, ctx) => writeOptional(ctx, outputPath, researchReport(topic, findings)), ['topic', 'findings']);

  add('scan_suspicious_ip', 'Score IP addresses using local signals or a future threat-intelligence adapter.', 'low', { ip: 'string', events: 'array?' }, async ({ ip, events = [] }) => ({ ok: true, ip, score: scoreIp(ip, events), signals: ipSignals(ip, events) }), ['ip']);
  add('block_ip_address', 'Prepare a firewall block command. This is high risk and always approval-gated.', 'critical', { ip: 'string', reason: 'string?' }, async ({ ip, reason }) => ({ ok: true, approvalRequired: true, ip, reason, commandHint: `sudo ufw deny from ${ip}` }), ['ip']);
  add('alert_admin', 'Send an urgent admin alert through the outbound channel or a configured telephony adapter.', 'high', { message: 'string', severity: 'string?' }, async ({ message, severity = 'high' }, ctx) => registry.get('send_reply').execute({ message: `[${severity.toUpperCase()}] ${message}` }, ctx), ['message']);

  add('print_receipt_to_thermal', 'Prepare or send receipt text to a thermal printer adapter.', 'high', { printer: 'string?', receiptText: 'string' }, async (args) => ({ ok: true, approvalRequired: true, mode: 'adapter-required', commandHint: 'Configure ESC/POS or CUPS printer adapter for live printing.', request: args }), ['receiptText']);
  add('check_printer_paper', 'Check printer paper status through a hardware adapter.', 'low', { printer: 'string?' }, async (args) => ({ ok: false, adapterRequired: true, request: args, commandHint: 'Use printer SDK, CUPS lpstat, or ESC/POS status query on the POS PC.' }));
  add('control_smart_environment', 'Prepare smart lighting or playlist automation actions.', 'high', { device: 'string', mode: 'string', schedule: 'string?' }, async (args) => ({ ok: true, approvalRequired: true, mode: 'adapter-required', request: args }), ['device', 'mode']);

  add('convert_audio_format', 'Prepare or run an FFmpeg audio conversion command.', 'high', { inputPath: 'string', outputPath: 'string', format: 'string?' }, async ({ inputPath, outputPath, format = 'mp3' }, ctx) => ctx.sandboxRunner ? registry.get('run_command').execute({ command: 'ffmpeg', args: ['-y', '-i', inputPath, outputPath] }, ctx) : ({ ok: false, commandHint: `ffmpeg -y -i ${inputPath} ${outputPath}`, format }), ['inputPath', 'outputPath']);
  add('generate_audio_waveform', 'Prepare an FFmpeg command to generate a waveform image.', 'high', { inputPath: 'string', outputPath: 'string?' }, async ({ inputPath, outputPath = 'waveform.png' }) => ({ ok: false, commandHint: `ffmpeg -i ${inputPath} -filter_complex showwavespic=s=1280x360 ${outputPath}` }), ['inputPath']);
  add('auto_upload_media', 'Prepare a media upload package. Live uploads require a distributor/cloud adapter and approval.', 'high', { trackPath: 'string', coverPath: 'string?', metadata: 'object?' }, async (args) => ({ ok: true, approvalRequired: true, mode: 'adapter-required', request: args }), ['trackPath']);

  add('track_delivery_status', 'Track a shipment through a configured logistics adapter.', 'low', { trackingNumber: 'string', courier: 'string?' }, async (args) => ({ ok: false, adapterRequired: true, request: args }), ['trackingNumber']);
  add('generate_purchase_order', 'Generate a simple purchase order Markdown file.', 'medium', { supplier: 'string', items: 'array', outputPath: 'string?' }, async ({ supplier, items = [], outputPath }, ctx) => writeOptional(ctx, outputPath, purchaseOrder(supplier, items)), ['supplier', 'items']);
  add('calculate_dynamic_cost', 'Calculate dynamic COGS/HPP from ingredient costs and recipe quantities.', 'low', { recipe: 'array', overheadRate: 'number?' }, async ({ recipe = [], overheadRate = 0 }) => dynamicCost(recipe, overheadRate), ['recipe']);

  add('sync_offline_to_cloud', 'Prepare ordered offline-to-cloud sync batches. Live writes require a connector and approval.', 'high', { records: 'array', destination: 'string' }, async ({ records = [], destination }) => ({ ok: true, approvalRequired: true, destination, batches: records.map((record, index) => ({ index, record })) }), ['records', 'destination']);
  add('resolve_data_conflict', 'Resolve conflicting row edits using timestamps, source priority, or manual review.', 'medium', { versions: 'array', prioritySources: 'array?' }, async ({ versions = [], prioritySources = [] }) => resolveConflict(versions, prioritySources), ['versions']);

  add('scrape_restaurant_reviews', 'Collect restaurant review rows from supplied data or a compliant scraper adapter.', 'medium', { rows: 'array?', source: 'string?' }, async ({ rows = [], source = '' }) => ({ ok: true, mode: rows.length ? 'provided-data' : 'adapter-required', source, reviews: rows }));
  add('analyze_customer_sentiment', 'Analyze review sentiment with simple keyword scoring.', 'low', { reviews: 'array' }, async ({ reviews = [] }) => sentimentReport(reviews), ['reviews']);
  add('draft_apology_response', 'Draft a polite response for low-star reviews. Does not publish automatically.', 'low', { review: 'string', customerName: 'string?' }, async ({ review, customerName = 'there' }) => ({ ok: true, draft: `Hi ${customerName}, thank you for the feedback. We are sorry the experience did not meet expectations. We will review the issue and improve immediately. Your note: ${trimToChars(review, 240)}` }), ['review']);

  add('analyze_multiple_indicators', 'Combine supplied technical indicator values into a non-advisory signal summary.', 'low', { indicators: 'object', symbol: 'string?' }, async ({ indicators = {}, symbol = '' }) => indicatorSummary(indicators, symbol), ['indicators']);
  add('execute_buy_sell_order', 'Prepare a critical trading order request. Never executes without broker adapter and explicit approval.', 'critical', { symbol: 'string', side: 'string', lot: 'number', stopLoss: 'number?', takeProfit: 'number?' }, async (args) => ({ ok: true, approvalRequired: true, mode: 'broker-adapter-required', request: args }), ['symbol', 'side', 'lot']);
  add('calculate_dynamic_lot', 'Calculate a position size from balance, risk percentage, and stop-loss distance.', 'low', { balance: 'number', riskPercent: 'number', stopLossPoints: 'number', valuePerPoint: 'number?' }, async (args) => calculateLot(args), ['balance', 'riskPercent', 'stopLossPoints']);

  add('check_store_availability', 'Prepare a music store availability check across streaming platforms.', 'low', { trackTitle: 'string', artist: 'string', platforms: 'array?' }, async (args) => ({ ok: false, adapterRequired: true, request: args }), ['trackTitle', 'artist']);
  add('pitch_to_curators', 'Draft personalized playlist curator pitches. Sending is approval-gated.', 'high', { trackTitle: 'string', artist: 'string', curators: 'array', genre: 'string?' }, async (args) => curatorPitches(args), ['trackTitle', 'artist', 'curators']);
  add('claim_artist_profile', 'Prepare artist profile claim checklist and form data.', 'medium', { artist: 'string', platforms: 'array?' }, async ({ artist, platforms = [] }) => ({ ok: true, artist, platforms, checklist: ['Verify distributor access', 'Prepare artist photo', 'Prepare social links', 'Submit claim form'] }), ['artist']);

  add('detect_fraudulent_voids', 'Detect suspicious POS void patterns by item, cashier, and time window.', 'low', { rows: 'array', itemField: 'string?', actionField: 'string?' }, async ({ rows = [], itemField = 'item', actionField = 'action' }) => detectVoids(rows, itemField, actionField), ['rows']);
  add('aggregate_multi_store_data', 'Aggregate sales or POS rows across branches.', 'low', { rows: 'array', branchField: 'string?', amountField: 'string?' }, async ({ rows = [], branchField = 'branch', amountField = 'amount' }) => aggregateStores(rows, branchField, amountField), ['rows']);
  add('schedule_kitchen_maintenance', 'Create kitchen maintenance schedule based on usage counts.', 'medium', { equipment: 'array', threshold: 'number?' }, async ({ equipment = [], threshold = 1000 }) => ({ ok: true, schedule: equipment.filter((item) => Number(item.uses || 0) >= threshold).map((item) => ({ equipment: item.name, action: 'maintenance-due' })) }), ['equipment']);

  add('manage_household_schedule', 'Prepare smart-home routine actions around household schedule constraints.', 'medium', { routines: 'array', constraints: 'array?' }, async ({ routines = [], constraints = [] }) => ({ ok: true, routines, constraints, conflicts: findRoutineConflicts(routines, constraints) }), ['routines']);
  add('auto_order_groceries', 'Prepare grocery reorder requests. Live purchases require marketplace adapter and approval.', 'high', { items: 'array', budget: 'number?' }, async ({ items = [], budget }) => ({ ok: true, approvalRequired: true, items: items.filter((item) => Number(item.qty || 0) <= Number(item.min || 0)), budget }), ['items']);

  add('spawn_sub_agent', 'Prepare a high-risk request to launch another local TunaFlowAI worker on a different port.', 'high', { port: 'number', profile: 'string?' }, async ({ port, profile = 'worker' }) => ({ ok: true, approvalRequired: true, commandHint: `TUNAFLOW_PROFILE=${profile} TUNAFLOW_PORT=${port} npm run dev`, port, profile }), ['port']);
  add('delegate_task', 'Break a project into smaller tasks and assign them to local agents.', 'medium', { project: 'string', agents: 'array?', count: 'number?' }, async ({ project, agents = [], count = 5 }) => delegateTask(project, agents, count), ['project']);
}

async function rowsFromArgs(args, ctx) {
  if (Array.isArray(args.rows)) return args.rows;
  if (args.path) return readRows(ctx.workspace, args.path, args.delimiter);
  return [];
}

async function textFromArgs(args, ctx) {
  if (args.text) return String(args.text);
  if (args.path) return (await readTextLike(args.path, ctx, args.maxChars || 20000)).text;
  return '';
}

async function readTextLike(rel, ctx, maxChars = 12000) {
  if (/\.pdf$/i.test(rel) && ctx?.toolRegistry?.get?.('read_pdf_text')) {
    return ctx.toolRegistry.get('read_pdf_text').execute({ path: rel, maxChars }, ctx);
  }
  const file = safeJoin(ctx.workspace, rel);
  const text = await fs.readFile(file, 'utf8').catch(async () => (await fs.readFile(file)).toString('latin1'));
  return { ok: true, path: rel, text: trimToChars(text, maxChars), warning: /\.(docx|pdf)$/i.test(rel) ? 'Lightweight text extraction only. Use a document/PDF plugin for high fidelity extraction.' : undefined };
}

async function readRows(workspace, rel, delimiter = null) {
  const raw = await fs.readFile(safeJoin(workspace, rel), 'utf8');
  if (/\.json$/i.test(rel)) return JSON.parse(raw);
  return parseDelimited(raw, delimiter || (raw.includes('\t') ? '\t' : ','));
}

function parseDelimited(text, delimiter = ',') {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = splitLine(lines[0], delimiter);
  return lines.slice(1).map((line) => Object.fromEntries(splitLine(line, delimiter).map((value, i) => [headers[i] || `col${i + 1}`, value])));
}

function splitLine(line, delimiter) {
  const out = []; let cur = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === delimiter && !quoted) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function summarizeAdMetrics(rows) {
  const count = rows.length;
  const clicks = sum(rows, 'clicks'); const impressions = sum(rows, 'impressions'); const cost = sum(rows, 'cost');
  return { count, clicks, impressions, cost, ctr: impressions ? clicks / impressions : 0, cpc: clicks ? cost / clicks : 0 };
}
function sum(rows, field) { return rows.reduce((total, row) => total + Number(row[field] || 0), 0); }
function rankKeywords({ text, keywords, rows }) { const counts = new Map(); for (const word of String(text).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)) counts.set(word, (counts.get(word) || 0) + 1); for (const key of keywords) counts.set(String(key).toLowerCase(), (counts.get(String(key).toLowerCase()) || 0) + 3); for (const row of rows || []) for (const value of Object.values(row)) for (const word of String(value).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)) counts.set(word, (counts.get(word) || 0) + 1); return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([keyword, score]) => ({ keyword, score })); }
function scoreCandidate(text, requirements, mustHave = []) { const lower = String(text).toLowerCase(); const hits = requirements.filter((r) => lower.includes(String(r).toLowerCase())); const missingMustHave = mustHave.filter((r) => !lower.includes(String(r).toLowerCase())); return { ok: true, score: Math.round((hits.length / Math.max(1, requirements.length)) * 100), hits, missingMustHave, recommendation: missingMustHave.length ? 'reject-or-review' : hits.length >= requirements.length * 0.6 ? 'shortlist' : 'review' }; }
async function cleanCsvData(args, ctx) { const rows = await rowsFromArgs(args, ctx); const seen = new Set(); const clean = rows.filter((row) => { const values = Object.values(row || {}); if (!values.some((v) => String(v || '').trim())) return false; const key = JSON.stringify(row); if (seen.has(key)) return false; seen.add(key); return true; }); if (args.outputPath) await writeCsv(ctx.workspace, args.outputPath, clean); return { ok: true, before: rows.length, after: clean.length, removed: rows.length - clean.length, outputPath: args.outputPath || null, rows: clean.slice(0, 200) }; }
async function findAnomalies(args, ctx) { const rows = await rowsFromArgs(args, ctx); const values = rows.map((row, i) => ({ i, row, value: Number(row[args.field]) })).filter((x) => Number.isFinite(x.value)); const mean = values.reduce((a, b) => a + b.value, 0) / Math.max(1, values.length); const sd = Math.sqrt(values.reduce((a, b) => a + Math.pow(b.value - mean, 2), 0) / Math.max(1, values.length)); const threshold = Number(args.threshold || 2); return { ok: true, mean, sd, anomalies: values.filter((x) => sd && Math.abs((x.value - mean) / sd) >= threshold).map((x) => ({ index: x.i, value: x.value, row: x.row })) }; }
async function generateChartSvg(args, ctx) { const rows = await rowsFromArgs(args, ctx); const yField = args.yField; const xField = args.xField; const values = rows.map((row, i) => ({ label: String(row[xField] ?? i + 1), value: Number(row[yField] || 0) })).slice(0, 80); const width = 900, height = 360, pad = 44; const max = Math.max(1, ...values.map((v) => v.value)); const barW = Math.max(4, (width - pad * 2) / Math.max(1, values.length)); const bars = values.map((v, i) => { const h = (height - pad * 2) * (v.value / max); const x = pad + i * barW; const y = height - pad - h; return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2, barW - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="#1dd3c7"/>`; }).join('\n'); const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#071b2c"/><text x="${pad}" y="26" fill="#dce9ef" font-family="Arial" font-size="18">${escapeXml(yField)} chart</text>${bars}<line x1="${pad}" y1="${height-pad}" x2="${width-pad}" y2="${height-pad}" stroke="#6d8794"/></svg>`; if (args.outputPath) { const file = safeJoin(ctx.workspace, args.outputPath); await ensureDir(path.dirname(file)); await fs.writeFile(file, svg, 'utf8'); } return { ok: true, outputPath: args.outputPath || null, svg }; }
function checkCalendarConflict(events, proposed) { const all = proposed ? [...events, proposed] : events; const conflicts = []; for (let i = 0; i < all.length; i += 1) for (let j = i + 1; j < all.length; j += 1) if (overlaps(all[i], all[j])) conflicts.push([all[i], all[j]]); return { ok: true, conflicts }; }
function overlaps(a, b) { const as = Date.parse(a.start), ae = Date.parse(a.end), bs = Date.parse(b.start), be = Date.parse(b.end); return Number.isFinite(as + ae + bs + be) && as < be && bs < ae; }
function isOverdue(task) { return task.status !== 'done' && task.done !== true && Date.parse(task.due || task.deadline || '') < Date.now(); }
function sprintReport(tasks) { const done = tasks.filter((t) => t.status === 'done' || t.done); const blocked = tasks.filter((t) => /block/i.test(t.status || '')); const overdue = tasks.filter(isOverdue); return { ok: true, markdown: `# Sprint Report\n\n- Completed: ${done.length}\n- Blocked: ${blocked.length}\n- Overdue: ${overdue.length}\n`, done, blocked, overdue }; }
async function translateDraft(args, ctx) { const text = args.text || (args.path ? (await readTextLike(args.path, ctx, 30000)).text : ''); return { ok: true, targetLanguage: args.targetLanguage, style: args.style || 'neutral', instruction: 'Send this text to the selected model for translation.', text: trimToChars(text, 4000) }; }
function proofread(text) { return String(text || '').replace(/[ \t]+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').replace(/([,.!?;:])([^\s])/g, '$1 $2').replace(/\bi\b/g, 'I').trim(); }
function toMarkdown(text, title) { const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean); return `${title ? `# ${title}\n\n` : ''}${lines.map((line) => line.length < 70 && !line.endsWith('.') ? `## ${line}` : `- ${line}`).join('\n')}`; }
function normalizePriceRow(row) { return { name: row.name || row.product || row.menu, price: Number(row.price || row.amount || 0), source: row.source || row.marketplace || '' }; }
function scanRiskyClauses(text) { const rules = ['penalty', 'liquidated damages', 'exclusive', 'non-compete', 'indemnify', 'unlimited liability', 'intellectual property', 'assignment', 'auto-renew', 'termination', 'late fee']; const matches = rules.flatMap((rule) => String(text).toLowerCase().includes(rule) ? [{ rule, severity: ['unlimited liability', 'intellectual property', 'non-compete'].includes(rule) ? 'high' : 'medium' }] : []); return { ok: true, matches, disclaimer: 'For legal review support only, not legal advice.' }; }
async function compareVersions(args, ctx) { const oldText = args.oldText || (args.oldPath ? (await readTextLike(args.oldPath, ctx, 40000)).text : ''); const newText = args.newText || (args.newPath ? (await readTextLike(args.newPath, ctx, 40000)).text : ''); const oldLines = new Set(oldText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)); const newLines = new Set(newText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)); return { ok: true, added: [...newLines].filter((l) => !oldLines.has(l)), removed: [...oldLines].filter((l) => !newLines.has(l)) }; }
async function generateNda(args, ctx) { const md = `# Mutual Non-Disclosure Agreement\n\nEffective date: ${args.effectiveDate || new Date().toISOString().slice(0, 10)}\n\nParties: ${args.disclosingParty} and ${args.receivingParty}.\n\nBoth parties agree to protect confidential information, use it only for the stated business purpose, restrict disclosure, and return or destroy materials on request.\n\nJurisdiction: ${args.jurisdiction || 'to be reviewed'}.\n\n> Draft only. Have a qualified lawyer review before signing.\n`; return writeOptional(ctx, args.outputPath, md); }
function analyzeLogs(text) { const lines = String(text).split(/\r?\n/); const errors = lines.filter((l) => /error|exception|fatal|failed/i.test(l)); const groups = {}; for (const line of errors) { const key = line.replace(/\d+/g, '#').slice(0, 120); groups[key] = (groups[key] || 0) + 1; } return { ok: true, totalLines: lines.length, errors: errors.length, groups: Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([pattern, count]) => ({ pattern, count })) }; }
function researchReport(topic, findings) { return `# Research Report: ${topic}\n\n${findings.map((f, i) => `## ${i + 1}. ${f.title || f.source || 'Finding'}\n\n${f.summary || f.text || ''}\n\nSource: ${f.url || f.source || 'n/a'}\n`).join('\n')}`; }
function scoreIp(ip, events) { let score = /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ? 5 : 30; score += Math.min(60, events.length * 5); return Math.min(100, score); }
function ipSignals(ip, events) { return [/^10\.|^192\.168\.|^172\./.test(ip) ? 'private-network' : 'public-network', events.length ? 'repeated-events' : 'single-event']; }
function purchaseOrder(supplier, items) { const total = items.reduce((a, item) => a + Number(item.qty || 1) * Number(item.price || 0), 0); return `# Purchase Order\n\nSupplier: ${supplier}\n\n${items.map((i) => `- ${i.name || i.sku}: ${i.qty || 1} x ${i.price || 0}`).join('\n')}\n\nTotal estimate: ${total}\n`; }
function dynamicCost(recipe, overheadRate) { const subtotal = recipe.reduce((sum, item) => sum + Number(item.qty || 1) * Number(item.unitCost || item.cost || 0), 0); return { ok: true, subtotal, overheadRate: Number(overheadRate), total: subtotal * (1 + Number(overheadRate || 0)), items: recipe }; }
function resolveConflict(versions, prioritySources) { const sorted = [...versions].sort((a, b) => { const pa = prioritySources.indexOf(a.source); const pb = prioritySources.indexOf(b.source); if (pa !== pb) return (pa < 0 ? 999 : pa) - (pb < 0 ? 999 : pb); return Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0); }); return { ok: true, winner: sorted[0] || null, reviewRequired: versions.length > 1 && JSON.stringify(sorted[0]?.value) !== JSON.stringify(sorted[1]?.value), versions }; }
function sentimentReport(reviews) { const pos = ['good', 'great', 'fast', 'fresh', 'delicious', 'excellent', 'friendly', 'clean']; const neg = ['bad', 'slow', 'cold', 'late', 'dirty', 'rude', 'broken', 'missing']; const scored = reviews.map((r) => { const text = String(r.text || r.review || r).toLowerCase(); const score = pos.filter((w) => text.includes(w)).length - neg.filter((w) => text.includes(w)).length; return { review: r, score, sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral' }; }); return { ok: true, positive: scored.filter((s) => s.score > 0).length, negative: scored.filter((s) => s.score < 0).length, neutral: scored.filter((s) => s.score === 0).length, scored }; }
function indicatorSummary(indicators, symbol) { const signals = []; if (Number(indicators.rsi) > 70) signals.push('RSI overbought'); if (Number(indicators.rsi) < 30) signals.push('RSI oversold'); if (indicators.macdCross === 'bullish') signals.push('MACD bullish cross'); if (indicators.macdCross === 'bearish') signals.push('MACD bearish cross'); if (Number(indicators.price) > Number(indicators.ema200 || Infinity)) signals.push('Price above EMA200'); return { ok: true, symbol, signals, disclaimer: 'Signal summary only, not financial advice.' }; }
function calculateLot({ balance, riskPercent, stopLossPoints, valuePerPoint = 1 }) { const riskAmount = Number(balance) * Number(riskPercent) / 100; const lot = riskAmount / Math.max(1, Number(stopLossPoints) * Number(valuePerPoint)); return { ok: true, riskAmount, lot }; }
function curatorPitches({ trackTitle, artist, curators = [], genre = 'music' }) { return { ok: true, approvalRequired: true, drafts: curators.map((c) => ({ curator: c.name || c.email || c, message: `Hi ${c.name || 'there'}, I am sharing ${trackTitle} by ${artist}, a ${genre} release that could fit your playlist. Thank you for listening.` })) }; }
function detectVoids(rows, itemField, actionField) { const voids = rows.filter((r) => /void|cancel/i.test(r[actionField] || '')); const byItem = {}; for (const row of voids) byItem[row[itemField] || 'unknown'] = (byItem[row[itemField] || 'unknown'] || 0) + 1; return { ok: true, voids: voids.length, suspiciousItems: Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([item, count]) => ({ item, count })) }; }
function aggregateStores(rows, branchField, amountField) { const out = {}; for (const row of rows) { const branch = row[branchField] || 'unknown'; out[branch] = out[branch] || { branch, count: 0, total: 0 }; out[branch].count += 1; out[branch].total += Number(row[amountField] || 0); } return { ok: true, branches: Object.values(out) }; }
function findRoutineConflicts(routines, constraints) { return routines.filter((routine) => constraints.some((c) => String(routine.time || '').includes(String(c.time || c)))); }
function delegateTask(project, agents, count = 5) { const n = limitNumber(count, 5, { min: 1, max: 20 }); const tasks = Array.from({ length: n }, (_, i) => ({ title: `${project} - workstream ${i + 1}`, assignee: agents[i % Math.max(1, agents.length)] || `agent-${i + 1}` })); return { ok: true, project, tasks }; }
async function writeOptional(ctx, outputPath, content) { if (outputPath) { const file = safeJoin(ctx.workspace, outputPath); await ensureDir(path.dirname(file)); await fs.writeFile(file, content, 'utf8'); return { ok: true, outputPath, content }; } return { ok: true, content }; }
async function writeCsv(workspace, rel, rows) { const file = safeJoin(workspace, rel); await ensureDir(path.dirname(file)); const headers = [...new Set(rows.flatMap((row) => Object.keys(row || {})))]; const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))]; await fs.writeFile(file, lines.join('\n') + '\n', 'utf8'); }
function csvEscape(value) { const s = String(value ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function escapeXml(value) { return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[ch])); }

import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, limitNumber, safeJoin, trimToChars } from '../core/utils.js';

export function registerJobWorkflowTools(registry) {
  registerIfMissing(registry, {
    name: 'fetch_ad_metrics',
    description: 'Read lightweight ad metrics from provided rows, JSON, or CSV export and summarize CTR/CPC/spend.',
    risk: 'low',
    schema: { required: [], properties: { path: 'string?', rows: 'array?', platform: 'string?' } },
    execute: async (args, ctx) => {
      const rows = await readRows(args, ctx);
      const metrics = summarizeAdMetrics(rows);
      return { ok: true, platform: args.platform || 'local-export', rows: rows.length, metrics };
    }
  });

  registerIfMissing(registry, {
    name: 'analyze_keywords',
    description: 'Analyze keyword candidates from text, rows, or seed keywords. Uses local data only unless a future adapter is configured.',
    risk: 'low',
    schema: { required: [], properties: { text: 'string?', keywords: 'array?', path: 'string?' } },
    execute: async (args, ctx) => {
      const sourceText = args.text || (args.path ? await readText(args.path, ctx) : '');
      const candidates = [...asArray(args.keywords), ...extractKeywordCandidates(sourceText)];
      const ranked = rankKeywords(candidates, sourceText);
      return { ok: true, keywords: ranked.slice(0, limitNumber(args.limit, 25, { min: 1, max: 100 })), note: 'For live Google Trends, connect an approved trends adapter or upload a Trends CSV export.' };
    }
  });

  registerIfMissing(registry, {
    name: 'generate_ad_copy',
    description: 'Generate lightweight ad-copy variants from a product, offer, audience, and tone.',
    risk: 'low',
    schema: { required: [], properties: { product: 'string?', offer: 'string?', audience: 'string?', tone: 'string?', count: 'number?' } },
    execute: async (args) => {
      const product = args.product || 'your offer';
      const offer = args.offer || 'a clear benefit';
      const audience = args.audience || 'the right audience';
      const tone = args.tone || 'confident and friendly';
      const templates = [
        `Meet ${product}: ${offer}. Built for ${audience}.`,
        `${audience} deserve a simpler way to get ${offer}. Try ${product}.`,
        `Stop guessing. Let ${product} help you unlock ${offer}.`,
        `${product} brings ${offer} without the extra hassle.`,
        `Ready for ${offer}? ${product} is made for ${audience}.`,
        `A ${tone} solution for ${audience}: ${product}.`,
        `Turn attention into action with ${product} and ${offer}.`
      ];
      return { ok: true, variants: templates.slice(0, limitNumber(args.count, 5, { min: 1, max: 10 })) };
    }
  });

  registerIfMissing(registry, {
    name: 'pause_losing_ads',
    description: 'Prepare or execute a pause decision for losing ad campaigns. High risk; approval should be required.',
    risk: 'high',
    schema: { required: ['campaignIds'], properties: { campaignIds: 'array', reason: 'string?', dryRun: 'boolean?' } },
    execute: async (args, ctx) => {
      const dryRun = args.dryRun !== false;
      const record = { campaignIds: asArray(args.campaignIds), reason: args.reason || 'performance below threshold', dryRun, at: new Date().toISOString() };
      await appendOutbox(ctx, 'ad-actions.jsonl', JSON.stringify(record) + '\n');
      return { ok: true, dryRun, action: dryRun ? 'prepared' : 'pause-request-recorded', record, note: dryRun ? 'No ad platform was changed. Set dryRun=false only behind an approved adapter.' : 'Recorded locally; real ad-platform integration must be configured separately.' };
    }
  });

  registerIfMissing(registry, {
    name: 'extract_resume_text',
    description: 'Extract text from TXT/MD/PDF-like resumes. DOCX/scanned PDF returns command guidance instead of doing OCR.',
    risk: 'low',
    schema: { required: ['path'], properties: { path: 'string', maxChars: 'number?' } },
    execute: async ({ path: rel, maxChars = 20000 }, ctx) => {
      const file = safeJoin(ctx.workspace, rel);
      const ext = path.extname(rel).toLowerCase();
      if (['.txt', '.md', '.json', '.csv'].includes(ext)) {
        const text = await fs.readFile(file, 'utf8');
        return { ok: true, path: rel, text: trimToChars(text, maxChars), quality: 'text' };
      }
      if (ext === '.pdf') {
        const buffer = await fs.readFile(file);
        const text = extractPdfTextLight(buffer);
        return { ok: Boolean(text.trim()), path: rel, text: trimToChars(text, maxChars), quality: text.trim() ? 'basic-pdf-text' : 'needs-ocr-or-pdf-parser', requiresCommand: !text.trim(), commandHint: text.trim() ? undefined : 'Use a trusted local parser/OCR, for example pdftotext or a reviewed PDF plugin, then pass the text back to TunaFlowAI.' };
      }
      if (ext === '.docx' || ext === '.doc') {
        return { ok: false, path: rel, text: '', requiresCommand: true, commandHint: 'DOC/DOCX extraction is intentionally not bundled to keep core light. Convert locally to TXT/PDF or add a reviewed docx adapter.' };
      }
      throw new Error('Unsupported resume extension: ' + ext);
    }
  });

  registerIfMissing(registry, {
    name: 'score_candidate',
    description: 'Score a candidate against required and nice-to-have skills using transparent keyword matching.',
    risk: 'low',
    schema: { required: [], properties: { resumeText: 'string?', path: 'string?', required: 'array?', niceToHave: 'array?' } },
    execute: async (args, ctx) => {
      const resumeText = args.resumeText || (args.path ? await readText(args.path, ctx) : '');
      const required = asArray(args.required);
      const niceToHave = asArray(args.niceToHave);
      const score = scoreText(resumeText, required, niceToHave);
      return { ok: true, ...score };
    }
  });

  registerIfMissing(registry, {
    name: 'send_notification',
    description: 'Send or log an internal notification. Uses outbound router if available; otherwise writes to .tunaflow/outbound.',
    risk: 'medium',
    schema: { required: ['message'], properties: { message: 'string', channel: 'string?', recipientId: 'string?', dryRun: 'boolean?' } },
    execute: async (args, ctx) => sendOrLog(args, ctx, 'notification')
  });

  registerIfMissing(registry, {
    name: 'send_interview_invite',
    description: 'Draft/send interview invitation. Medium risk because it contacts candidates.',
    risk: 'medium',
    schema: { required: ['candidateName', 'message'], properties: { candidateName: 'string', message: 'string', channel: 'string?', recipientId: 'string?', dryRun: 'boolean?' } },
    execute: async (args, ctx) => sendOrLog(args, ctx, 'interview-invite')
  });

  registerIfMissing(registry, {
    name: 'send_rejection_email',
    description: 'Draft/send a polite rejection email. Medium risk because it contacts candidates.',
    risk: 'medium',
    schema: { required: ['candidateName', 'message'], properties: { candidateName: 'string', message: 'string', channel: 'string?', recipientId: 'string?', dryRun: 'boolean?' } },
    execute: async (args, ctx) => sendOrLog(args, ctx, 'rejection-email')
  });

  registerIfMissing(registry, {
    name: 'clean_csv_data',
    description: 'Clean CSV/TSV data by removing empty rows and duplicates. Can write a cleaned CSV file.',
    risk: 'medium',
    schema: { required: ['path'], properties: { path: 'string', outputPath: 'string?', delimiter: 'string?', dedupe: 'boolean?' } },
    execute: async (args, ctx) => {
      const raw = await readText(args.path, ctx);
      const delimiter = args.delimiter || detectDelimiter(raw);
      let rows = parseDelimited(raw, delimiter);
      const before = rows.length;
      rows = rows.filter((row) => Object.values(row).some((value) => String(value || '').trim()));
      if (args.dedupe !== false) rows = dedupeRows(rows);
      const outputPath = args.outputPath || defaultArtifactPath('cleaned.csv');
      await writeText(outputPath, toDelimited(rows, delimiter), ctx);
      return { ok: true, inputRows: before, outputRows: rows.length, removedRows: before - rows.length, outputPath };
    }
  });

  registerIfMissing(registry, {
    name: 'find_data_anomalies',
    description: 'Find simple numeric anomalies in rows/CSV using z-score and spike ratio heuristics.',
    risk: 'low',
    schema: { required: [], properties: { path: 'string?', rows: 'array?', threshold: 'number?' } },
    execute: async (args, ctx) => {
      const rows = await readRows(args, ctx);
      const anomalies = findAnomalies(rows, Number(args.threshold || 2.5));
      return { ok: true, rows: rows.length, anomalies };
    }
  });

  registerIfMissing(registry, {
    name: 'generate_chart_image',
    description: 'Generate a lightweight SVG line/bar chart from rows. No Matplotlib dependency required.',
    risk: 'medium',
    schema: { required: [], properties: { path: 'string?', rows: 'array?', x: 'string?', y: 'string?', type: 'string?', outputPath: 'string?' } },
    execute: async (args, ctx) => {
      const rows = await readRows(args, ctx);
      const svg = chartSvg(rows, args);
      const outputPath = args.outputPath || defaultArtifactPath('chart.svg');
      await writeText(outputPath, svg, ctx);
      return { ok: true, outputPath, mime: 'image/svg+xml', rows: rows.length, type: args.type || 'line' };
    }
  });

  registerIfMissing(registry, {
    name: 'check_calendar_conflict',
    description: 'Check calendar conflicts from provided events or a JSON/CSV calendar export.',
    risk: 'low',
    schema: { required: [], properties: { events: 'array?', path: 'string?', start: 'string?', end: 'string?' } },
    execute: async (args, ctx) => {
      const events = await readCalendarEvents(args, ctx);
      const conflicts = detectConflicts(events, args.start, args.end);
      return { ok: true, events: events.length, conflicts };
    }
  });

  registerIfMissing(registry, {
    name: 'schedule_meeting',
    description: 'Create a local meeting record or prepare a calendar adapter request. Medium risk; approval recommended.',
    risk: 'medium',
    schema: { required: ['title', 'start', 'end'], properties: { title: 'string', start: 'string', end: 'string', attendees: 'array?', dryRun: 'boolean?' } },
    execute: async (args, ctx) => {
      const meeting = { title: args.title, start: args.start, end: args.end, attendees: asArray(args.attendees), at: new Date().toISOString() };
      if (args.dryRun === false) await appendOutbox(ctx, 'calendar-actions.jsonl', JSON.stringify(meeting) + '\n');
      return { ok: true, dryRun: args.dryRun !== false, meeting, note: args.dryRun === false ? 'Local calendar action recorded. Configure Google Calendar adapter for real scheduling.' : 'Dry run only.' };
    }
  });

  registerIfMissing(registry, {
    name: 'book_ticket_api',
    description: 'Prepare a travel ticket booking request. High risk; real booking requires explicit adapter and approval.',
    risk: 'high',
    schema: { required: ['from', 'to', 'date'], properties: { from: 'string', to: 'string', date: 'string', passenger: 'string?', dryRun: 'boolean?' } },
    execute: async (args, ctx) => {
      const request = { from: args.from, to: args.to, date: args.date, passenger: args.passenger || null, dryRun: args.dryRun !== false, at: new Date().toISOString() };
      await appendOutbox(ctx, 'travel-actions.jsonl', JSON.stringify(request) + '\n');
      return { ok: true, request, note: 'No ticket was purchased. Real booking must run through an approved travel API adapter.' };
    }
  });

  registerIfMissing(registry, {
    name: 'check_overdue_tasks',
    description: 'Check overdue project tasks from provided rows, JSON, CSV, or runtime tasks.',
    risk: 'low',
    schema: { required: [], properties: { path: 'string?', rows: 'array?', now: 'string?' } },
    execute: async (args, ctx) => {
      const rows = args.rows || (args.path ? await readRows(args, ctx) : (ctx.taskManager?.list?.({ limit: 500 }) || ctx.stateEngine?.getState?.()?.tasks || []));
      const nowDate = args.now ? new Date(args.now) : new Date();
      const overdue = rows.filter((task) => isOverdue(task, nowDate));
      return { ok: true, checked: rows.length, overdue };
    }
  });

  registerIfMissing(registry, {
    name: 'ping_team_member',
    description: 'Send/log a team reminder. Medium risk because it can contact people.',
    risk: 'medium',
    schema: { required: ['message'], properties: { message: 'string', member: 'string?', channel: 'string?', recipientId: 'string?', dryRun: 'boolean?' } },
    execute: async (args, ctx) => sendOrLog(args, ctx, 'team-ping')
  });

  registerIfMissing(registry, {
    name: 'generate_sprint_report',
    description: 'Summarize completed, overdue, blocked, and next project tasks into a sprint report.',
    risk: 'low',
    schema: { required: [], properties: { tasks: 'array?', path: 'string?' } },
    execute: async (args, ctx) => {
      const tasks = args.tasks || (args.path ? await readRows(args, ctx) : (ctx.taskManager?.list?.({ limit: 500 }) || ctx.stateEngine?.getState?.()?.tasks || []));
      return { ok: true, report: sprintReport(tasks) };
    }
  });

  registerIfMissing(registry, {
    name: 'translate_document',
    description: 'Read a document and prepare/write a translation. Actual translation can be produced by the model.',
    risk: 'medium',
    schema: { required: [], properties: { path: 'string?', text: 'string?', targetLanguage: 'string?', style: 'string?', translatedText: 'string?', outputPath: 'string?' } },
    execute: async (args, ctx) => {
      const source = args.text || (args.path ? await readText(args.path, ctx) : '');
      const brief = `Translate the following text to ${args.targetLanguage || 'the target language'} with a ${args.style || 'clear'} style. Preserve meaning, names, numbers, and formatting.`;
      if (args.translatedText && args.outputPath) await writeText(args.outputPath, args.translatedText, ctx);
      return { ok: true, sourceText: trimToChars(source, limitNumber(args.maxChars, 12000, { min: 100, max: 80000 })), translationBrief: brief, outputPath: args.translatedText && args.outputPath ? args.outputPath : undefined, note: args.translatedText ? 'Translated text was accepted from caller.' : 'Use the model to perform translation from sourceText, then call again with translatedText/outputPath if a file is needed.' };
    }
  });

  registerIfMissing(registry, {
    name: 'proofread_text',
    description: 'Lightweight proofreading for spacing, repeated punctuation, and simple typo patterns.',
    risk: 'low',
    schema: { required: [], properties: { text: 'string?', path: 'string?' } },
    execute: async (args, ctx) => {
      const text = args.text || (args.path ? await readText(args.path, ctx) : '');
      const cleaned = proofreadBasic(text);
      return { ok: true, text: cleaned, changed: cleaned !== text };
    }
  });

  registerIfMissing(registry, {
    name: 'format_to_markdown',
    description: 'Format raw text into readable Markdown sections and bullets. Can write an output file.',
    risk: 'medium',
    schema: { required: [], properties: { text: 'string?', path: 'string?', title: 'string?', outputPath: 'string?' } },
    execute: async (args, ctx) => {
      const text = args.text || (args.path ? await readText(args.path, ctx) : '');
      const markdown = toMarkdown(text, args.title);
      if (args.outputPath) await writeText(args.outputPath, markdown, ctx);
      return { ok: true, markdown, outputPath: args.outputPath };
    }
  });
}

function registerIfMissing(registry, tool) {
  if (registry.get?.(tool.name)) return;
  registry.register(tool);
}

async function readText(rel, ctx) {
  const file = safeJoin(ctx.workspace, rel);
  return fs.readFile(file, 'utf8');
}

async function writeText(rel, content, ctx) {
  const file = safeJoin(ctx.workspace, rel);
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, content || '', 'utf8');
}

async function appendOutbox(ctx, fileName, content) {
  const dir = path.join(ctx.dataDir || path.join(ctx.workspace, '.tunaflow'), 'outbound');
  await ensureDir(dir);
  await fs.appendFile(path.join(dir, fileName), content, 'utf8');
}

async function readRows(args, ctx) {
  if (Array.isArray(args.rows)) return args.rows;
  if (typeof args.data === 'string') return parseDelimited(args.data, args.delimiter || detectDelimiter(args.data));
  if (!args.path) return [];
  const raw = await readText(args.path, ctx);
  if (/\.json$/i.test(args.path)) {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.rows || []);
  }
  return parseDelimited(raw, args.delimiter || detectDelimiter(raw));
}

function detectDelimiter(raw) {
  const first = String(raw || '').split(/\r?\n/).find(Boolean) || '';
  return first.includes('\t') ? '\t' : ',';
}

function parseDelimited(raw, delimiter = ',') {
  const lines = String(raw || '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0], delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row = {};
    headers.forEach((header, idx) => { row[header || `col_${idx + 1}`] = values[idx] ?? ''; });
    return row;
  });
}

function splitCsvLine(line, delimiter) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === delimiter && !quoted) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function toDelimited(rows, delimiter = ',') {
  if (!rows.length) return '';
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [headers.join(delimiter), ...rows.map((row) => headers.map((h) => csvCell(row[h], delimiter)).join(delimiter))].join('\n') + '\n';
}

function csvCell(value, delimiter) {
  const text = String(value ?? '');
  return /["\r\n]/.test(text) || text.includes(delimiter) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarizeAdMetrics(rows) {
  const normalized = rows.map((row) => ({
    campaign: valueOf(row, ['campaign', 'campaignName', 'ad', 'name']) || 'unknown',
    impressions: numberOf(row, ['impressions', 'impr']),
    clicks: numberOf(row, ['clicks']),
    spend: numberOf(row, ['spend', 'cost', 'amount']),
    conversions: numberOf(row, ['conversions', 'leads', 'purchases'])
  }));
  const totals = normalized.reduce((acc, row) => {
    acc.impressions += row.impressions; acc.clicks += row.clicks; acc.spend += row.spend; acc.conversions += row.conversions;
    return acc;
  }, { impressions: 0, clicks: 0, spend: 0, conversions: 0 });
  totals.ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
  totals.cpc = totals.clicks ? totals.spend / totals.clicks : 0;
  totals.cpa = totals.conversions ? totals.spend / totals.conversions : null;
  const campaigns = normalized.map((row) => ({ ...row, ctr: row.impressions ? row.clicks / row.impressions : 0, cpc: row.clicks ? row.spend / row.clicks : 0 }));
  const losing = campaigns.filter((row) => row.spend > totals.spend / Math.max(1, campaigns.length) && row.ctr < totals.ctr * 0.75);
  return { totals, campaigns, losingCampaigns: losing };
}

function valueOf(row, names) {
  for (const name of names) {
    const hit = Object.keys(row).find((key) => key.toLowerCase() === name.toLowerCase());
    if (hit) return row[hit];
  }
  return undefined;
}

function numberOf(row, names) {
  const value = valueOf(row, names);
  if (value === undefined) return 0;
  const parsed = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractKeywordCandidates(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !COMMON.has(word));
}

const COMMON = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'will', 'about', 'untuk', 'yang', 'dan', 'atau', 'dari', 'dengan', 'kami', 'anda']);

function rankKeywords(candidates, corpus) {
  const counts = new Map();
  for (const item of candidates.filter(Boolean)) counts.set(item, (counts.get(item) || 0) + 1);
  const text = String(corpus || '').toLowerCase();
  return [...counts.entries()].map(([keyword, count]) => ({ keyword, score: count + (text.includes(keyword) ? 1 : 0), count })).sort((a, b) => b.score - a.score || a.keyword.localeCompare(b.keyword));
}

function extractPdfTextLight(buffer) {
  const raw = buffer.toString('latin1');
  const chunks = [];
  const re = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  let match;
  while ((match = re.exec(raw)) && chunks.length < 4000) chunks.push(match[1].replace(/\\([()\\])/g, '$1'));
  if (!chunks.length) {
    return raw.replace(/[^\x20-\x7E\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
  }
  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

function scoreText(text, required, niceToHave) {
  const low = String(text || '').toLowerCase();
  const req = required.map((skill) => ({ skill, matched: low.includes(String(skill).toLowerCase()) }));
  const nice = niceToHave.map((skill) => ({ skill, matched: low.includes(String(skill).toLowerCase()) }));
  const requiredScore = req.length ? req.filter((x) => x.matched).length / req.length : 1;
  const niceScore = nice.length ? nice.filter((x) => x.matched).length / nice.length : 0;
  const score = Math.round((requiredScore * 80 + niceScore * 20) * 100) / 100;
  return { score, required: req, niceToHave: nice, recommendation: score >= 75 ? 'shortlist' : (score >= 50 ? 'review' : 'reject-or-hold') };
}

async function sendOrLog(args, ctx, type) {
  const dryRun = args.dryRun !== false;
  const message = args.message || '';
  const payload = { type, message, channel: args.channel, recipientId: args.recipientId, dryRun, at: new Date().toISOString() };
  if (!dryRun && ctx.outboundRouter && args.channel) {
    const delivery = await ctx.outboundRouter.send({ channel: args.channel, recipientId: args.recipientId, text: message, event: ctx.event, metadata: { type } });
    return { ok: true, dryRun: false, delivery };
  }
  await appendOutbox(ctx, `${type}.jsonl`, JSON.stringify(payload) + '\n');
  return { ok: true, dryRun, logged: true, payload };
}

function findAnomalies(rows, threshold) {
  const columns = numericColumns(rows);
  const findings = [];
  for (const col of columns) {
    const values = rows.map((row) => Number(row[col])).filter(Number.isFinite);
    if (values.length < 3) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const stdev = Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length) || 1;
    rows.forEach((row, idx) => {
      const value = Number(row[col]);
      if (!Number.isFinite(value)) return;
      const z = (value - avg) / stdev;
      if (Math.abs(z) >= threshold) findings.push({ row: idx + 1, column: col, value, zScore: Math.round(z * 100) / 100, reason: 'z-score' });
      const prev = idx > 0 ? Number(rows[idx - 1][col]) : null;
      if (Number.isFinite(prev) && prev !== 0 && value / prev >= 2.5) findings.push({ row: idx + 1, column: col, value, previous: prev, ratio: Math.round((value / prev) * 100) / 100, reason: 'spike' });
    });
  }
  return findings.slice(0, 200);
}

function numericColumns(rows) {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  return keys.filter((key) => rows.some((row) => Number.isFinite(Number(row[key]))));
}

function chartSvg(rows, args) {
  const width = Number(args.width || 900);
  const height = Number(args.height || 420);
  const pad = 48;
  const yKey = args.y || numericColumns(rows)[0];
  const xKey = args.x || Object.keys(rows[0] || {})[0];
  const values = rows.map((row, idx) => ({ label: row[xKey] || String(idx + 1), value: Number(row[yKey]) })).filter((row) => Number.isFinite(row.value));
  const max = Math.max(...values.map((row) => row.value), 1);
  const points = values.map((row, idx) => {
    const x = pad + (idx * (width - pad * 2)) / Math.max(1, values.length - 1);
    const y = height - pad - (row.value / max) * (height - pad * 2);
    return { ...row, x, y };
  });
  const title = args.title || `${yKey || 'value'} by ${xKey || 'row'}`;
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const bars = points.map((p, idx) => {
    const barWidth = Math.max(8, (width - pad * 2) / Math.max(1, points.length) * 0.6);
    const x = pad + idx * ((width - pad * 2) / Math.max(1, points.length)) + barWidth * 0.2;
    const h = height - pad - p.y;
    return `<rect x="${x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="#13a3b8" opacity="0.82"/>`;
  }).join('\n');
  const body = args.type === 'bar' ? bars : `<polyline fill="none" stroke="#13a3b8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${line}"/>` + points.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#ff7f6e"/>`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" rx="22" fill="#f4fdff"/>
  <text x="${pad}" y="30" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#052c3a">${escapeXml(title)}</text>
  <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#b9dfe5"/>
  <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#b9dfe5"/>
  ${body}
</svg>`;
}

async function readCalendarEvents(args, ctx) {
  const rows = args.events || (args.path ? await readRows(args, ctx) : []);
  return rows.map((event) => ({ ...event, start: event.start || event.begin || event.from, end: event.end || event.finish || event.to })).filter((event) => event.start && event.end);
}

function detectConflicts(events, start, end) {
  const targetStart = start ? new Date(start) : null;
  const targetEnd = end ? new Date(end) : null;
  const conflicts = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (overlap(events[i], events[j])) conflicts.push({ a: events[i], b: events[j] });
    }
    if (targetStart && targetEnd && overlap(events[i], { start: targetStart, end: targetEnd })) conflicts.push({ a: events[i], b: { start, end, title: 'requested-slot' } });
  }
  return conflicts;
}

function overlap(a, b) {
  const as = new Date(a.start).getTime();
  const ae = new Date(a.end).getTime();
  const bs = new Date(b.start).getTime();
  const be = new Date(b.end).getTime();
  return Number.isFinite(as) && Number.isFinite(ae) && Number.isFinite(bs) && Number.isFinite(be) && as < be && bs < ae;
}

function isOverdue(task, nowDate) {
  const due = task.due || task.deadline || task.dueDate || task.end;
  if (!due) return false;
  const done = /done|complete|closed|resolved/i.test(String(task.status || ''));
  return !done && new Date(due).getTime() < nowDate.getTime();
}

function sprintReport(tasks) {
  const groups = { completed: [], overdue: [], blocked: [], open: [] };
  const nowDate = new Date();
  for (const task of tasks || []) {
    const status = String(task.status || '').toLowerCase();
    if (/done|complete|closed|resolved/.test(status)) groups.completed.push(task);
    else if (/block|stuck/.test(status)) groups.blocked.push(task);
    else if (isOverdue(task, nowDate)) groups.overdue.push(task);
    else groups.open.push(task);
  }
  return [
    '# Sprint Report',
    '',
    `Completed: ${groups.completed.length}`,
    `Overdue: ${groups.overdue.length}`,
    `Blocked: ${groups.blocked.length}`,
    `Open: ${groups.open.length}`,
    '',
    '## Highlights',
    ...groups.completed.slice(0, 8).map((t) => '- Done: ' + (t.title || t.name || t.id || 'task')),
    ...groups.blocked.slice(0, 8).map((t) => '- Blocked: ' + (t.title || t.name || t.id || 'task')),
    ...groups.overdue.slice(0, 8).map((t) => '- Overdue: ' + (t.title || t.name || t.id || 'task'))
  ].join('\n');
}

function proofreadBasic(text) {
  return String(text || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])([^\s\n])/g, '$1 $2')
    .replace(/\bteh\b/gi, 'the')
    .replace(/\brecieve\b/gi, 'receive')
    .replace(/\bseperate\b/gi, 'separate')
    .trim();
}

function toMarkdown(text, title) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const body = lines.map((line) => {
    if (/^[-*#>]/.test(line)) return line;
    if (line.length < 64 && !/[.!?]$/.test(line)) return '## ' + line;
    return '- ' + line;
  }).join('\n');
  return (title ? '# ' + title + '\n\n' : '') + body + '\n';
}

function asArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function defaultArtifactPath(fileName) {
  return path.join('.tunaflow', 'artifacts', String(Date.now()) + '-' + fileName).replaceAll('\\', '/');
}

function escapeXml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

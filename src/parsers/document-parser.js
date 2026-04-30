import fs from 'node:fs/promises';
import path from 'node:path';
import { trimToChars } from '../core/utils.js';

export class ProductionDocumentParser {
  constructor({ config = {}, auditLog = null } = {}) {
    this.config = { maxChars: Number(config.maxChars || 80000), ...config };
    this.auditLog = auditLog;
  }

  async parse(filePath, options = {}) {
    const ext = path.extname(filePath).toLowerCase();
    if (['.txt', '.md', '.csv', '.json', '.log'].includes(ext)) return this.parseText(filePath, options);
    if (ext === '.xlsx' || ext === '.xls') return this.parseXlsx(filePath, options);
    if (ext === '.pdf') return this.parsePdf(filePath, options);
    throw new Error(`Unsupported document format: ${ext}`);
  }

  async parseText(filePath, options = {}) {
    const text = await fs.readFile(filePath, 'utf8');
    return this.result(filePath, 'text', text, { quality: 'production-text', ...options });
  }

  async parseXlsx(filePath, options = {}) {
    const XLSX = await optionalImport('xlsx');
    const workbook = XLSX.readFile(filePath, { cellDates: true, dense: false });
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '', raw: false })
    }));
    const text = sheets.map((sheet) => `# ${sheet.name}\n${sheet.rows.map((row) => JSON.stringify(row)).join('\n')}`).join('\n\n');
    return this.result(filePath, 'xlsx', text, { sheets, quality: 'production-xlsx', ...options });
  }

  async parsePdf(filePath, options = {}) {
    const pdfParse = await optionalImport('pdf-parse');
    const data = await pdfParse(await fs.readFile(filePath));
    return this.result(filePath, 'pdf', data.text || '', { pages: data.numpages, info: data.info, quality: 'production-pdf-text', ...options });
  }

  async result(filePath, type, text, metadata = {}) {
    const output = { ok: true, path: filePath, type, text: trimToChars(text, metadata.maxChars || this.config.maxChars), rawChars: String(text || '').length, metadata };
    if (this.auditLog) await this.auditLog.record('document.parse', { path: filePath, type, rawChars: output.rawChars, quality: metadata.quality });
    return output;
  }
}

async function optionalImport(name) {
  try { return (await import(name)).default || await import(name); }
  catch (_) { throw new Error(`Production parser requires optional package '${name}'. Run: npm install ${name}`); }
}

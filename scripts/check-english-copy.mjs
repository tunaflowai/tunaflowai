#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());
const includeExt = new Set(['.js', '.mjs', '.json', '.md', '.html']);
const skipDirs = new Set(['.git', 'node_modules', '.tunaflow', 'dist', 'coverage', '_archive']);
const skipFiles = new Set(['package-lock.json']);
const userFacingJs = new Set(['src/dashboard/dashboard.js', 'src/security/dashboard-auth.js', 'src/core/gateway.js', 'src/cli.js']);
const englishPhrases = [
  'getting started', 'quick start', 'dashboard is protected', 'enter the local dashboard password',
  'send to tunaflowai', 'no response yet', 'nothing to show', 'command every channel',
  'choose a model', 'registered tools', 'bundled skills', 'pending approvals', 'not found',
  'unauthorized', 'local-first ai work operating', 'english by default', 'never bypass',
  'never expose secrets', 'never claim completed work', 'safety-aware', 'action-oriented'
];
const allowedTechnical = [/Discord|Slack|WhatsApp|Playwright|Socket Mode|Gateway|WebSocket|Bearer|OAuth|API|JSON|HTTP|URL|CLI/i, /[`$/{}/<>]/, /[A-Z0-9_]{3,}/];
const matches = [];
await walk(root);
if (matches.length) {
  console.error('Potential English user-facing copy found in repository files:');
  for (const match of matches.slice(0, 200)) console.error(`${path.relative(root, match.file)}:${match.line}: ${match.phrase}`);
  if (matches.length > 200) console.error(`...and ${matches.length - 200} more`);
  process.exit(1);
}
console.log('No obvious English user-facing copy found in docs, dashboard, CLI, and public config. Technical identifiers/protocol names are allowed.');

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { await walk(full); continue; }
    if (!includeExt.has(path.extname(entry.name)) || skipFiles.has(entry.name)) continue;
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (rel === 'scripts/check-english-copy.mjs') continue;
    if (path.extname(entry.name) === '.js' && !userFacingJs.has(rel)) continue;
    if (path.extname(entry.name) === '.json' && !['package.json', 'config/tunaflow.config.example.json'].includes(rel)) continue;
    const text = await fs.readFile(full, 'utf8').catch(() => '');
    text.split(/\r?\n/).forEach((line, index) => {
      if (allowedTechnical.some((rule) => rule.test(line))) return;
      const lower = line.toLowerCase();
      for (const phrase of englishPhrases) if (lower.includes(phrase)) matches.push({ file: full, line: index + 1, phrase });
    });
  }
}

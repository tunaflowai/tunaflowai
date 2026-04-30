#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());
const includeExt = new Set(['.js', '.mjs', '.cjs', '.json', '.md', '.html', '.yml', '.yaml']);
const skipDirs = new Set(['.git', 'node_modules', '.tunaflow', 'dist', 'coverage', '_archive']);
const skipFiles = new Set(['package-lock.json']);
const localLanguageTerms = [
  '\u0062\u0061\u0068\u0061\u0073\u0061 \u0069\u006e\u0064\u006f\u006e\u0065\u0073\u0069\u0061',
  '\u0069\u006e\u0064\u006f\u006e\u0065\u0073\u0069\u0061 \u0073\u0065\u0063\u0061\u0072\u0061 \u0062\u0061\u0077\u0061\u0061\u006e',
  '\u0064\u0061\u0073\u0062\u006f\u0072',
  '\u006b\u0061\u0074\u0061 \u0073\u0061\u006e\u0064\u0069',
  '\u0073\u0069\u006d\u0070\u0061\u006e',
  '\u0062\u0075\u006b\u0061 \u0064\u0061\u0073\u0062\u006f\u0072',
  '\u006d\u0061\u0073\u0075\u006b',
  '\u006b\u0065\u006c\u0075\u0061\u0072',
  '\u0070\u0065\u006e\u0067\u0067\u0075\u006e\u0061',
  '\u0072\u0061\u0068\u0061\u0073\u0069\u0061',
  '\u0070\u0065\u0072\u0073\u0065\u0074\u0075\u006a\u0075\u0061\u006e',
  '\u0064\u0069\u0074\u006f\u006c\u0061\u006b',
  '\u0064\u0069\u0074\u0065\u0072\u0069\u006d\u0061',
  '\u0074\u0075\u0067\u0061\u0073',
  '\u0070\u0065\u0072\u0069\u006e\u0074\u0061\u0068',
  '\u006d\u0065\u006d\u0075\u0061\u0074',
  '\u0062\u0065\u006c\u0075\u006d \u0061\u0064\u0061',
  '\u0074\u0069\u0064\u0061\u006b \u0064\u0069\u0074\u0065\u006d\u0075\u006b\u0061\u006e',
  '\u0074\u0069\u0064\u0061\u006b \u0074\u0065\u0072\u006f\u0074\u006f\u0072\u0069\u0073\u0061\u0073\u0069',
  '\u0072\u0069\u006e\u0067\u006b\u0061\u0073\u0061\u006e',
  '\u0070\u0061\u006e\u0064\u0075\u0061\u006e',
  '\u0063\u0061\u0072\u0061 \u0063\u0065\u0070\u0061\u0074',
  '\u006a\u0061\u006c\u0061\u006e\u006b\u0061\u006e',
  '\u0062\u0065\u0072\u006a\u0061\u006c\u0061\u006e',
  '\u006b\u0065\u0061\u006d\u0061\u006e\u0061\u006e',
  '\u006a\u0061\u006e\u0067\u0061\u006e \u0070\u0065\u0072\u006e\u0061\u0068',
  '\u0067\u0075\u006e\u0061\u006b\u0061\u006e',
  '\u006d\u0065\u006d\u0062\u0075\u0074\u0075\u0068\u006b\u0061\u006e',
  '\u0062\u0065\u006c\u0075\u006d \u0064\u0069\u006b\u006f\u006e\u0066\u0069\u0067\u0075\u0072\u0061\u0073\u0069',
  '\u0067\u0061\u0067\u0061\u006c \u0064\u0069\u0062\u0075\u006b\u0061',
  '\u006c\u0061\u0070\u006f\u0072\u0061\u006e',
  '\u0070\u0065\u006b\u0065\u0072\u006a\u0061\u0061\u006e',
  '\u0062\u0065\u0072\u006f\u0072\u0069\u0065\u006e\u0074\u0061\u0073\u0069 \u0061\u006b\u0073\u0069',
  '\u0068\u0061\u0074\u0069\u002d\u0068\u0061\u0074\u0069',
  '\u0062\u0065\u0072\u0062\u0061\u0073\u0069\u0073 \u0062\u0075\u006b\u0074\u0069',
  '\u0072\u0069\u006e\u0067\u006b\u0061\u0073',
  '\u0061\u006d\u0061\u006e \u0073\u0065\u0063\u0061\u0072\u0061 \u0062\u0061\u0077\u0061\u0061\u006e'
];
const allowedFalsePositives = [/\u0062\u0061\u0068\u0061\u0073\u0061 \u0069\u006e\u0064\u006f\u006e\u0065\u0073\u0069\u0061/i];
const matches = [];
await walk(root);
if (matches.length) {
  console.error('Potential local-language copy found in repository files:');
  for (const match of matches.slice(0, 300)) console.error(`${path.relative(root, match.file)}:${match.line}: ${match.term}`);
  if (matches.length > 300) console.error(`...and ${matches.length - 300} more`);
  process.exit(1);
}
console.log('No obvious local-language copy found in scanned repository files. English UI/docs/copy are allowed.');

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { await walk(full); continue; }
    if (!includeExt.has(path.extname(entry.name)) || skipFiles.has(entry.name)) continue;
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (rel === 'scripts/check-english-copy.mjs') continue;
    const text = await fs.readFile(full, 'utf8').catch(() => '');
    text.split(/\r?\n/).forEach((line, index) => {
      const lower = line.toLowerCase();
      if (allowedFalsePositives.some((rule) => rule.test(line))) return;
      for (const term of localLanguageTerms) if (lower.includes(term)) matches.push({ file: full, line: index + 1, term });
    });
  }
}

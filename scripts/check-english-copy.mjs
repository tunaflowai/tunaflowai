#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());
const includeExt = new Set(['.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css']);
const skipDirs = new Set(['.git', 'node_modules', '.tunaflow', 'dist', 'coverage']);
const words = [
  'kalau', 'jika di', 'butuh', 'kerjaan', 'pesanan', 'kasir', 'harga', 'stok', 'dapur',
  'iklan', 'pengiriman', 'persetujuan', 'ditolak', 'diterima', 'perintah',
  'pengguna', 'kata sandi', 'tugas', 'cabang', 'struk', 'bahan baku', 'ulasan', 'pajak restoran'
];
const matches = [];
await walk(root);
if (matches.length) {
  console.error('Potential Indonesian copy found in repository files:');
  for (const match of matches.slice(0, 200)) {
    console.error(`${path.relative(root, match.file)}:${match.line}: ${match.word}`);
  }
  if (matches.length > 200) console.error(`...and ${matches.length - 200} more`);
  process.exit(1);
}
console.log('No obvious Indonesian copy found in scanned source/docs files.');

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { await walk(full); continue; }
    if (!includeExt.has(path.extname(entry.name))) continue;
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (rel === 'scripts/check-english-copy.mjs') continue;
    const text = await fs.readFile(full, 'utf8').catch(() => '');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      for (const word of words) {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = word.includes(' ') ? escaped : `\\b${escaped}\\b`;
        if (new RegExp(pattern, 'i').test(line)) matches.push({ file: full, line: index + 1, word });
      }
    });
  }
}

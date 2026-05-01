#!/usr/bin/env node
// Bundles src/cli.js and all dependencies into a single dist/cli.js
// Result: Node.js reads 1 file instead of 41 — dramatically faster on slow filesystems.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// esbuild is a devDependency — skip build gracefully if not installed
let build;
try {
  ({ build } = await import('esbuild'));
} catch {
  console.log('esbuild not available — skipping bundle build (dist/cli.js will not be updated).');
  console.log('Run `npm install` with devDependencies to build the bundle.\n');
  process.exit(0);
}

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/cli.js'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist/cli.js',
  // Keep node: builtins external — they are always available
  external: ['node:*', 'crypto', 'fs', 'path', 'http', 'https', 'os', 'stream', 'url', 'util', 'events', 'child_process', 'readline', 'buffer', 'net', 'tls', 'dns', 'assert', 'zlib'],
  minify: true,
  sourcemap: false,
  logLevel: 'info',
});

// Inject the shebang line (esbuild strips it from the output)
const out = resolve('dist/cli.js');
const content = readFileSync(out, 'utf8');
if (!content.startsWith('#!/usr/bin/env node')) {
  writeFileSync(out, '#!/usr/bin/env node\n' + content, 'utf8');
}

console.log('\nBuild complete → dist/cli.js');
console.log('Run with: node dist/cli.js dev\n');

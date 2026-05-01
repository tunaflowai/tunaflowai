#!/usr/bin/env node
// Standalone token generator — zero project imports, runs instantly.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const token = crypto.randomBytes(32).toString('hex');
const envFile = path.resolve('.env');
const envKey = 'TUNAFLOW_API_TOKEN';

let content = '';
try { content = await fs.readFile(envFile, 'utf8'); } catch (_e) {}

const line = `${envKey}=${token}`;
const pattern = new RegExp(`^${envKey}=.*$`, 'm');
if (pattern.test(content)) {
  content = content.replace(pattern, line);
} else {
  content = content ? `${content.trimEnd()}\n${line}\n` : `${line}\n`;
}

await fs.writeFile(envFile, content, 'utf8');

console.log(`\nToken generated and saved to .env\n`);
console.log(`  ${envKey}=${token}`);
console.log(`\nCopy the token above and paste it into the "Token Bearer"`);
console.log(`field in the TunaFlowAI dashboard sidebar.\n`);
console.log(`Restart the server for the token to take effect if it is already running.\n`);

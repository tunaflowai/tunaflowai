#!/usr/bin/env node
// Start the TunaFlowAI server in the background and return control to the shell.
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, openSync, closeSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const dataDir = '.tunaflow';
const pidFile = path.join(dataDir, 'server.pid');
const logFile = path.join(dataDir, 'server.log');
const envFile = '.env';

mkdirSync(dataDir, { recursive: true });

// Auto-generate API token on first run so the dashboard works out of the box
let envContent = '';
try { envContent = readFileSync(envFile, 'utf8'); } catch {}
if (!/^TUNAFLOW_API_TOKEN=.+$/m.test(envContent)) {
  const token = randomBytes(32).toString('hex');
  const line = `TUNAFLOW_API_TOKEN=${token}`;
  envContent = envContent ? envContent.trimEnd() + '\n' + line + '\n' : line + '\n';
  writeFileSync(envFile, envContent, 'utf8');
  console.log('Generated new API token in .env');
}

if (existsSync(pidFile)) {
  try {
    const pid = Number(readFileSync(pidFile, 'utf8').trim());
    if (pid) {
      try { process.kill(pid, 0); console.log(`Server already running (PID ${pid}). Stopping it first...`); process.kill(pid, 'SIGTERM'); }
      catch { /* not running */ }
    }
  } catch {}
}

closeSync(openSync(logFile, 'w'));

const out = openSync(logFile, 'a');
const err = openSync(logFile, 'a');

const child = spawn('node', ['src/cli.js', 'dev'], {
  detached: true,
  stdio: ['ignore', out, err],
  env: process.env
});

child.unref();

const start = Date.now();
const timeoutMs = 10000;
const seen = new Set();

while (Date.now() - start < timeoutMs) {
  await new Promise((r) => setTimeout(r, 200));
  let log = '';
  try { log = readFileSync(logFile, 'utf8'); } catch {}
  for (const line of log.split('\n')) {
    if (!line || seen.has(line)) continue;
    seen.add(line);
    console.log(line);
  }
  if (log.includes('gateway running')) {
    writeFileSync(pidFile, String(child.pid));
    console.log(`\nServer running in background (PID ${child.pid}).`);
    console.log(`Logs:    tail -f ${logFile}`);
    console.log(`Stop:    npm run stop\n`);
    process.exit(0);
  }
  if (log.includes('Error') || log.includes('error')) break;
}

console.error('\nServer failed to start within 10s. Check logs:');
try { console.error(readFileSync(logFile, 'utf8')); } catch {}
try { process.kill(child.pid, 'SIGTERM'); } catch {}
process.exit(1);

#!/usr/bin/env node
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';

const pidFile = path.join('.tunaflow', 'server.pid');

if (!existsSync(pidFile)) {
  console.log('No server PID file. Nothing to stop.');
  process.exit(0);
}

const pid = Number(readFileSync(pidFile, 'utf8').trim());
try {
  process.kill(pid, 'SIGTERM');
  unlinkSync(pidFile);
  console.log(`Server stopped (PID ${pid}).`);
} catch (err) {
  if (err.code === 'ESRCH') {
    unlinkSync(pidFile);
    console.log('Server was not running. PID file removed.');
  } else {
    console.error('Failed to stop server:', err.message);
    process.exit(1);
  }
}

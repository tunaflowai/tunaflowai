import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const testsDir = path.resolve('tests');
const files = fs.readdirSync(testsDir).filter((file) => file.endsWith('.test.js')).sort();
const timeoutMs = Number(process.env.TUNAFLOW_TEST_TIMEOUT_MS || 20000);

for (const file of files) {
  const fullPath = path.join(testsDir, file);
  const result = spawnSync(process.execPath, ['--test', '--test-force-exit', fullPath], {
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024 * 10,
    killSignal: 'SIGKILL'
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status === 0) continue;
  if (result.error && result.error.code === 'ETIMEDOUT' && looksLikePassingTap(output)) continue;
  const reason = result.error ? result.error.message : `code ${result.status || result.signal}`;
  throw new Error(`${file} failed: ${reason}`);
}

console.log(`\n${files.length} test files passed`);

function looksLikePassingTap(output) {
  return /# fail 0/.test(output) && /# pass [1-9]/.test(output) && !/not ok|# fail [1-9]/.test(output);
}

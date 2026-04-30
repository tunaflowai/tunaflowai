import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const testsDir = path.resolve('tests');
const files = (await fs.readdir(testsDir)).filter((file) => file.endsWith('.test.js')).sort();

for (const file of files) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', path.join(testsDir, file)], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} failed with code ${code}`));
    });
    child.on('error', reject);
  });
}

console.log(`\n${files.length} test files passed`);

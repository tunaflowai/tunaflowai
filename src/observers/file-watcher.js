import fs from 'node:fs';
import path from 'node:path';

export function startFileWatcher({ root, runtime, debounceMs = 500 }) {
  const timers = new Map();
  const resolved = path.resolve(root || process.cwd());
  const watcher = fs.watch(resolved, { recursive: false }, (eventType, filename) => {
    if (!filename) return;
    const rel = String(filename);
    if (rel.includes('node_modules') || rel.includes('.git') || rel.includes('.tunaflow')) return;
    clearTimeout(timers.get(rel));
    timers.set(rel, setTimeout(() => {
      runtime.handleEvent({ type: 'file.changed', path: rel, payload: { eventType } }).catch((error) => {
        console.error('[TunaFlow file watcher]', error);
      });
    }, debounceMs));
  });
  return watcher;
}

import fs from 'node:fs/promises';

export function startTerminalLogWatcher({ file, runtime, intervalMs = 1000 }) {
  let offset = 0;
  let stopped = false;

  async function tick() {
    if (stopped) return;
    try {
      const handle = await fs.open(file, 'r');
      const stat = await handle.stat();
      if (stat.size < offset) offset = 0;
      if (stat.size > offset) {
        const buffer = Buffer.alloc(stat.size - offset);
        await handle.read(buffer, 0, buffer.length, offset);
        offset = stat.size;
        const text = buffer.toString('utf8');
        if (text.trim()) await runtime.handleEvent({ type: 'terminal.output', text });
      }
      await handle.close();
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('[TunaFlow terminal watcher]', error.message);
    } finally {
      setTimeout(tick, intervalMs);
    }
  }

  tick();
  return { stop: () => { stopped = true; } };
}

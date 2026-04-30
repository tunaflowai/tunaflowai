import fs from 'node:fs/promises';
import path from 'node:path';

export class PluginMarketplaceIndex {
  constructor({ indexPath = 'plugins/marketplace.json', sources = [] } = {}) {
    this.indexPath = indexPath;
    this.sources = sources;
  }

  async load() {
    const local = await readJson(this.indexPath, { version: 1, plugins: [] });
    const remote = [];
    for (const source of this.sources) {
      if (!/^https?:\/\//i.test(source)) continue;
      const data = await fetch(source).then((r) => r.ok ? r.json() : null).catch(() => null);
      if (data?.plugins) remote.push(...data.plugins);
    }
    return { version: local.version || 1, plugins: dedupe([...(local.plugins || []), ...remote]) };
  }

  async search(query = '') {
    const index = await this.load();
    const q = query.toLowerCase();
    return index.plugins.filter((plugin) => !q || [plugin.name, plugin.description, ...(plugin.tags || [])].join(' ').toLowerCase().includes(q));
  }
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(path.resolve(file), 'utf8')); } catch { return fallback; }
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => item?.name && !seen.has(item.name) && seen.add(item.name));
}

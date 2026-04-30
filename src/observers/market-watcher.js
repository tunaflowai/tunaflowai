import { sleep } from '../core/utils.js';

export class MarketWatcher {
  constructor({ assets = [], intervalMs = 60000, thresholdPercent = 3, fetcher = fetch } = {}) {
    this.assets = assets;
    this.intervalMs = intervalMs;
    this.thresholdPercent = thresholdPercent;
    this.fetcher = fetcher;
    this.running = false;
    this.last = new Map();
  }

  async start(emit) {
    this.running = true;
    while (this.running) {
      for (const asset of this.assets) {
        const data = await this.fetchAsset(asset).catch((error) => ({ error: error.message }));
        if (!data.error) {
          const previous = this.last.get(asset.id || asset.symbol);
          this.last.set(asset.id || asset.symbol, data.price);
          const change = previous ? ((data.price - previous) / previous) * 100 : 0;
          if (Math.abs(change) >= this.thresholdPercent) {
            await emit({ type: 'market.price_spike', priority: 'high', text: `${asset.id || asset.symbol} moved ${change.toFixed(2)}% to ${data.price}`, payload: { asset, data, previous, change } });
          }
        }
      }
      await sleep(this.intervalMs);
    }
  }

  stop() { this.running = false; }

  async fetchAsset(asset) {
    if (asset.type === 'stock') {
      const symbol = String(asset.symbol || asset.id).toLowerCase();
      const response = await this.fetcher(`https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`);
      const text = await response.text();
      const row = text.trim().split('\n')[1]?.split(',') || [];
      return { provider: 'stooq', price: Number(row[6] || row[3] || 0), raw: text };
    }
    const id = asset.id || asset.symbol;
    const currency = asset.currency || 'usd';
    const response = await this.fetcher(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${encodeURIComponent(currency)}&include_24hr_change=true&include_24hr_vol=true`);
    const data = await response.json();
    return { provider: 'coingecko', price: Number(data[id]?.[currency] || 0), raw: data };
  }
}

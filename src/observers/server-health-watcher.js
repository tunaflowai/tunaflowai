import { sleep } from '../core/utils.js';

export class ServerHealthWatcher {
  constructor({ services = [], intervalMs = 30000, timeoutMs = 8000 } = {}) {
    this.services = services;
    this.intervalMs = intervalMs;
    this.timeoutMs = timeoutMs;
    this.running = false;
  }

  async start(emit) {
    this.running = true;
    while (this.running) {
      for (const service of this.services) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
          const response = await fetch(service.url, { signal: controller.signal });
          if (!response.ok) await emit({ type: 'server.unhealthy', priority: 'high', text: `${service.name || service.url} returned HTTP ${response.status}`, payload: { service, status: response.status } });
        } catch (error) {
          await emit({ type: 'server.down', priority: 'high', text: `${service.name || service.url} is unreachable: ${error.message}`, payload: { service, error: error.message } });
        } finally {
          clearTimeout(timer);
        }
      }
      await sleep(this.intervalMs);
    }
  }

  stop() { this.running = false; }
}

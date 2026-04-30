export class RemoteAuditBackend {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled === true,
      endpoint: config.endpoint || process.env[config.endpointEnv || 'TUNAFLOW_AUDIT_ENDPOINT'],
      token: config.token || process.env[config.tokenEnv || 'TUNAFLOW_AUDIT_TOKEN'],
      timeoutMs: Number(config.timeoutMs || 8000),
      failClosed: config.failClosed === true
    };
  }

  async send(entry) {
    if (!this.config.enabled || !this.config.endpoint) return { ok: true, skipped: true };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.config.token ? { authorization: `Bearer ${this.config.token}` } : {}) },
        body: JSON.stringify(entry),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`remote audit HTTP ${response.status}`);
      return { ok: true, status: response.status };
    } catch (error) {
      if (this.config.failClosed) throw error;
      return { ok: false, error: error.message };
    } finally {
      clearTimeout(timer);
    }
  }
}

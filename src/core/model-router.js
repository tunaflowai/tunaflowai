import path from 'node:path';
import { MockProvider } from '../models/mock-provider.js';
import { OpenAICompatibleProvider } from '../models/openai-compatible-provider.js';
import { approximateTokens, extractJsonObject, now, readJson, withTimeout } from './utils.js';

export class ModelRouter {
  constructor(config = {}, auditLog = null) {
    this.config = withDefaults(config);
    this.auditLog = auditLog;
    this.providers = new Map();
    this.health = new Map();

    for (const model of this.config.models) {
      this.providers.set(model.name, createProvider(model));
      this.health.set(model.name, {
        failures: 0,
        successes: 0,
        totalAttempts: 0,
        lastError: null,
        lastAttemptAt: null,
        nextRetryAt: 0,
        lastSuccessAt: null
      });
    }
  }

  static async fromConfigFile(configFile, auditLog = null) {
    const config = await readJson(path.resolve(configFile), {});
    return new ModelRouter(config, auditLog);
  }

  getHealth() {
    const out = {};
    for (const [name, health] of this.health.entries()) {
      out[name] = {
        ...health,
        coolingDown: Boolean(health.nextRetryAt && Date.now() < health.nextRetryAt)
      };
    }
    return out;
  }

  async complete({ messages, json = false, chain = 'default', taskType = 'general', maxOutputTokens, temperature }) {
    const selectedChain = this.resolveChain(chain);
    const inputTokens = approximateTokens(messages);
    const maxInputTokens = this.config.tokenBudget.maxInputTokens;
    const maxAttempts = this.config.tokenBudget.maxModelCallsPerEvent;

    if (inputTokens > maxInputTokens) {
      throw new Error(`Input budget exceeded: approx ${inputTokens} tokens > ${maxInputTokens}`);
    }

    const attempts = [];
    const errors = [];
    let actualAttempts = 0;

    for (const modelName of selectedChain) {
      if (actualAttempts >= maxAttempts) {
        attempts.push({ model: modelName, skipped: true, reason: 'max-model-calls-exceeded', maxAttempts });
        continue;
      }

      const model = this.config.modelsByName.get(modelName);
      if (!model || model.enabled === false) {
        attempts.push({ model: modelName, skipped: true, reason: 'disabled-or-missing' });
        continue;
      }

      const health = this.health.get(modelName);
      if (health.nextRetryAt && Date.now() < health.nextRetryAt) {
        attempts.push({ model: modelName, skipped: true, reason: 'cooldown', nextRetryAt: health.nextRetryAt });
        continue;
      }

      const provider = this.providers.get(modelName);
      const timeoutMs = model.timeoutMs || this.config.fallback.timeoutMs;
      const startedAt = Date.now();
      actualAttempts += 1;
      health.totalAttempts += 1;
      health.lastAttemptAt = now();

      try {
        await this.audit('model.attempt', { model: modelName, chain, taskType, inputTokens, maxOutputTokens: maxOutputTokens || this.config.tokenBudget.maxOutputTokens });
        const result = await withTimeout(
          (signal) => provider.complete({
            messages,
            maxOutputTokens: maxOutputTokens || this.config.tokenBudget.maxOutputTokens,
            temperature,
            signal,
            json
          }),
          timeoutMs,
          `model ${modelName}`
        );

        const parsedJson = json ? extractJsonObject(result.content) : undefined;
        const output = {
          model: { name: modelName, provider: model.provider, model: model.model || model.name },
          content: result.content,
          usage: result.usage,
          attempts: [...attempts, { model: modelName, ok: true, latencyMs: Date.now() - startedAt }],
          json: parsedJson,
          raw: result.raw
        };

        health.failures = 0;
        health.successes += 1;
        health.lastError = null;
        health.nextRetryAt = 0;
        health.lastSuccessAt = now();
        await this.audit('model.success', { model: modelName, chain, latencyMs: Date.now() - startedAt, usage: result.usage });
        return output;
      } catch (error) {
        health.failures += 1;
        health.lastError = error.message;
        if (health.failures >= this.config.fallback.maxFailuresBeforeCooldown) {
          health.nextRetryAt = Date.now() + this.config.fallback.cooldownMs;
        }
        const attempt = { model: modelName, ok: false, error: error.message, latencyMs: Date.now() - startedAt };
        attempts.push(attempt);
        errors.push(`${modelName}: ${error.message}`);
        await this.audit('model.failure', attempt);
      }
    }

    const message = `All models failed for chain ${chain}: ${errors.join(' | ') || 'no enabled models'}`;
    await this.audit('model.all_failed', { chain, taskType, attempts, errors });
    const error = new Error(message);
    error.attempts = attempts;
    throw error;
  }

  resolveChain(chain) {
    const selected = this.config.chains[chain] || this.config.chains.default || [];
    if (selected.length > 0) return selected;
    return this.config.models.map((model) => model.name);
  }

  async audit(type, payload) {
    if (this.auditLog) await this.auditLog.record(type, payload);
  }
}

function createProvider(model) {
  if (model.provider === 'mock') return new MockProvider(model);
  if (model.provider === 'openai-compatible') return new OpenAICompatibleProvider(model);
  throw new Error(`Unsupported provider: ${model.provider}`);
}

function withDefaults(config) {
  const models = config.models || [{ name: 'local-mock-fallback', provider: 'mock', behavior: 'ok', enabled: true }];
  const normalized = {
    ...config,
    tokenBudget: {
      maxInputTokens: 8000,
      maxOutputTokens: 1200,
      maxModelCallsPerEvent: 3,
      ...(config.tokenBudget || {})
    },
    fallback: {
      timeoutMs: 20000,
      cooldownMs: 30000,
      maxFailuresBeforeCooldown: 2,
      ...(config.fallback || {})
    },
    chains: config.chains || { default: models.map((model) => model.name) },
    models
  };
  normalized.modelsByName = new Map(models.map((model) => [model.name, model]));
  return normalized;
}

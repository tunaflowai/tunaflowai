import path from 'node:path';
import { approximateTokens, extractJsonObject, now, readJson, withTimeout } from './utils.js';
import { createModelProvider, enrichModelConfig, listProviderIds } from '../models/provider-registry.js';
import { listProviderPresets, providerConfigExamples } from '../models/model-catalog.js';

export class ModelRouter {
  constructor(config = {}, auditLog = null) {
    this.config = withDefaults(config);
    this.auditLog = auditLog;
    this.providers = new Map();
    this.health = new Map();

    for (const model of this.config.models) {
      this.providers.set(model.name, createModelProvider(model));
      this.health.set(model.name, {
        provider: model.provider,
        model: model.model || model.name,
        capability: model.capability,
        failures: 0,
        successes: 0,
        totalAttempts: 0,
        lastError: null,
        lastAttemptAt: null,
        nextRetryAt: 0,
        lastSuccessAt: null,
        latencyMs: { last: null, average: null },
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
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

  getCatalog() {
    return {
      providers: listProviderIds(),
      presets: listProviderPresets(),
      examples: providerConfigExamples(),
      configuredModels: this.config.models.map((model) => ({
        name: model.name,
        provider: model.provider,
        model: model.model,
        enabled: model.enabled !== false,
        capability: model.capability
      })),
      chains: this.config.chains
    };
  }

  async complete({ messages, json = false, jsonSchema = null, tools = null, toolChoice = undefined, chain = 'default', taskType = 'general', maxOutputTokens, temperature, requiredCapabilities = [], reasoning = undefined, extraBody = {} }) {
    const selectedChain = this.resolveChain(chain, requiredCapabilities);
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

      const missing = missingCapabilities(model, requiredCapabilities);
      if (missing.length > 0) {
        attempts.push({ model: modelName, skipped: true, reason: 'missing-capabilities', missing });
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
        await this.audit('model.attempt', {
          model: modelName,
          provider: model.provider,
          chain,
          taskType,
          inputTokens,
          requiredCapabilities,
          maxOutputTokens: maxOutputTokens || this.config.tokenBudget.maxOutputTokens
        });

        const result = await withTimeout(
          (signal) => provider.complete({
            messages,
            maxOutputTokens: maxOutputTokens || this.config.tokenBudget.maxOutputTokens,
            temperature,
            signal,
            json,
            jsonSchema,
            tools,
            toolChoice,
            reasoning,
            extraBody
          }),
          timeoutMs,
          `model ${modelName}`
        );

        const parsedJson = json ? extractJsonObject(result.content) : undefined;
        const latencyMs = Date.now() - startedAt;
        const output = {
          model: { name: modelName, provider: model.provider, model: model.model || model.name },
          content: result.content,
          usage: result.usage,
          attempts: [...attempts, { model: modelName, ok: true, latencyMs }],
          json: parsedJson,
          toolCalls: result.toolCalls || [],
          raw: result.raw
        };

        updateSuccessHealth(health, result.usage, latencyMs);
        await this.audit('model.success', { model: modelName, chain, latencyMs, usage: result.usage });
        return output;
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        updateFailureHealth(health, error, latencyMs, this.config.fallback);
        const attempt = { model: modelName, ok: false, error: error.message, latencyMs };
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

  resolveChain(chain, requiredCapabilities = []) {
    const selected = this.config.chains[chain] || this.config.chains.default || [];
    const names = selected.length > 0 ? selected : this.config.models.map((model) => model.name);
    if (!requiredCapabilities.length) return names;
    return names.filter((name) => {
      const model = this.config.modelsByName.get(name);
      return model && missingCapabilities(model, requiredCapabilities).length === 0;
    }).concat(names.filter((name) => {
      const model = this.config.modelsByName.get(name);
      return !model || missingCapabilities(model, requiredCapabilities).length > 0;
    }));
  }

  async audit(type, payload) {
    if (this.auditLog) await this.auditLog.record(type, payload);
  }
}

function updateSuccessHealth(health, usage = {}, latencyMs) {
  health.failures = 0;
  health.successes += 1;
  health.lastError = null;
  health.nextRetryAt = 0;
  health.lastSuccessAt = now();
  health.latencyMs.last = latencyMs;
  health.latencyMs.average = health.latencyMs.average == null ? latencyMs : Math.round((health.latencyMs.average * 0.75) + (latencyMs * 0.25));
  health.usage.inputTokens += usage?.inputTokens || 0;
  health.usage.outputTokens += usage?.outputTokens || 0;
  health.usage.totalTokens += usage?.totalTokens || ((usage?.inputTokens || 0) + (usage?.outputTokens || 0));
}

function updateFailureHealth(health, error, latencyMs, fallback) {
  health.failures += 1;
  health.lastError = error.message;
  health.latencyMs.last = latencyMs;
  health.latencyMs.average = health.latencyMs.average == null ? latencyMs : Math.round((health.latencyMs.average * 0.75) + (latencyMs * 0.25));
  if (health.failures >= fallback.maxFailuresBeforeCooldown) {
    health.nextRetryAt = Date.now() + fallback.cooldownMs;
  }
}

function missingCapabilities(model, requiredCapabilities) {
  const supports = model.capability?.supports || {};
  return requiredCapabilities.filter((capability) => supports[capability] !== true);
}

function withDefaults(config) {
  const rawModels = config.models || [{ name: 'local-mock-fallback', provider: 'mock', behavior: 'ok', enabled: true }];
  const models = rawModels.map((model) => enrichModelConfig(model));
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

import { approximateTokens } from '../../core/utils.js';

export class AnthropicProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async complete({ messages = [], maxOutputTokens = 1200, temperature = 0.2, signal, json = false }) {
    const apiKey = this.config.apiKey || process.env[this.config.apiKeyEnv || 'ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error(`Missing API key for ${this.config.name || this.config.model}`);
    if (!this.config.model || this.config.model === 'YOUR_MODEL_NAME') {
      throw new Error(`Model is not configured for ${this.config.name || 'anthropic provider'}`);
    }

    const baseUrl = (this.config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '');
    const { system, anthropicMessages } = normalizeMessages(messages, json);
    const body = {
      model: this.config.model,
      max_tokens: this.config.maxOutputTokens || maxOutputTokens,
      temperature: this.config.temperature ?? temperature,
      messages: anthropicMessages,
      ...(system ? { system } : {}),
      ...(this.config.extraBody || {})
    };

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': this.config.apiVersion || '2023-06-01',
        ...(this.config.headers || {})
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Model ${this.config.name} returned HTTP ${response.status}: ${text.slice(0, 700)}`);
    }

    const data = await response.json();
    const content = (data.content || []).map((part) => part.text || '').filter(Boolean).join('\n');
    if (!content) throw new Error(`Model ${this.config.name} returned no message content`);

    return {
      content,
      usage: {
        inputTokens: data.usage?.input_tokens ?? approximateTokens(messages),
        outputTokens: data.usage?.output_tokens ?? approximateTokens(content),
        totalTokens: data.usage ? (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0) : undefined
      },
      raw: data
    };
  }
}

function normalizeMessages(messages, json) {
  const system = [];
  const anthropicMessages = [];

  for (const message of messages) {
    if (message.role === 'system' || message.role === 'developer') {
      system.push(message.content || '');
    } else if (message.role === 'assistant') {
      anthropicMessages.push({ role: 'assistant', content: asText(message.content) });
    } else {
      anthropicMessages.push({ role: 'user', content: asText(message.content) });
    }
  }

  if (json) {
    system.push('Return valid JSON only. Do not include markdown fences or commentary.');
  }

  return { system: system.filter(Boolean).join('\n\n'), anthropicMessages };
}

function asText(content) {
  if (typeof content === 'string') return content;
  return JSON.stringify(content);
}

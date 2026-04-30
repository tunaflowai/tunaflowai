import { approximateTokens } from '../../core/utils.js';

export class GeminiProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async complete({ messages = [], maxOutputTokens = 1200, temperature = 0.2, signal, json = false }) {
    const apiKey = this.config.apiKey || process.env[this.config.apiKeyEnv || 'GEMINI_API_KEY'];
    if (!apiKey) throw new Error(`Missing API key for ${this.config.name || this.config.model}`);
    if (!this.config.model || this.config.model === 'YOUR_MODEL_NAME') {
      throw new Error(`Model is not configured for ${this.config.name || 'gemini provider'}`);
    }

    const baseUrl = (this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
    const body = {
      contents: toGeminiContents(messages),
      generationConfig: {
        temperature: this.config.temperature ?? temperature,
        maxOutputTokens: this.config.maxOutputTokens || maxOutputTokens,
        ...(json ? { responseMimeType: 'application/json' } : {}),
        ...(this.config.generationConfig || {})
      },
      ...(this.config.systemInstruction ? { systemInstruction: { parts: [{ text: this.config.systemInstruction }] } } : {}),
      ...(this.config.extraBody || {})
    };

    const response = await fetch(`${baseUrl}/models/${encodeURIComponent(this.config.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        ...(this.config.headers || {})
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Model ${this.config.name} returned HTTP ${response.status}: ${text.slice(0, 700)}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const content = parts.map((part) => part.text || '').filter(Boolean).join('\n');
    if (!content) throw new Error(`Model ${this.config.name} returned no message content`);

    return {
      content,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount ?? approximateTokens(messages),
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? approximateTokens(content),
        totalTokens: data.usageMetadata?.totalTokenCount
      },
      raw: data
    };
  }
}

function toGeminiContents(messages) {
  const contents = [];
  const system = [];
  for (const message of messages) {
    if (message.role === 'system' || message.role === 'developer') {
      system.push(asText(message.content));
    } else {
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: asText(message.content) }]
      });
    }
  }
  if (system.length > 0) {
    contents.unshift({ role: 'user', parts: [{ text: system.join('\n\n') }] });
  }
  return contents;
}

function asText(content) {
  if (typeof content === 'string') return content;
  return JSON.stringify(content);
}

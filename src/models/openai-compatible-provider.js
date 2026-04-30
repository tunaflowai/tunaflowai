import { approximateTokens } from '../core/utils.js';

export class OpenAICompatibleProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async complete({ messages = [], maxOutputTokens = 1200, temperature = 0.2, signal }) {
    const apiKey = this.config.apiKey || process.env[this.config.apiKeyEnv || 'OPENAI_API_KEY'];
    if (!apiKey) throw new Error(`Missing API key for ${this.config.name || this.config.model}`);
    if (!this.config.model || this.config.model === 'YOUR_MODEL_NAME') {
      throw new Error(`Model is not configured for ${this.config.name || 'openai-compatible provider'}`);
    }

    const baseUrl = (this.config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature,
        max_tokens: maxOutputTokens
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Model ${this.config.name} returned HTTP ${response.status}: ${text.slice(0, 500)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(`Model ${this.config.name} returned no message content`);

    return {
      content,
      usage: data.usage || {
        inputTokens: approximateTokens(messages),
        outputTokens: approximateTokens(content)
      },
      raw: data
    };
  }
}

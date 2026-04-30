import { approximateTokens } from '../core/utils.js';

export class OpenAICompatibleProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async complete({ messages = [], maxOutputTokens = 1200, temperature = 0.2, signal, json = false, jsonSchema = null, tools = null, toolChoice = undefined, reasoning = undefined, extraBody = {} }) {
    const apiKey = this.config.apiKey || process.env[this.config.apiKeyEnv || 'OPENAI_API_KEY'];
    if (!apiKey) throw new Error(`Missing API key for ${this.config.name || this.config.model}`);
    if (!this.config.model || this.config.model === 'YOUR_MODEL_NAME') {
      throw new Error(`Model is not configured for ${this.config.name || 'openai-compatible provider'}`);
    }

    const baseUrl = (this.config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const endpoint = this.config.endpoint || '/chat/completions';
    const body = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature ?? temperature,
      max_tokens: this.config.maxOutputTokens || maxOutputTokens,
      ...(this.config.extraBody || {}),
      ...(extraBody || {})
    };

    if (this.config.maxCompletionTokens) {
      delete body.max_tokens;
      body.max_completion_tokens = this.config.maxCompletionTokens;
    }

    if (jsonSchema && this.config.jsonSchemaMode) {
      body.response_format = {
        type: 'json_schema',
        json_schema: jsonSchema
      };
    } else if (json && this.config.jsonMode !== false) {
      body.response_format = this.config.responseFormat || { type: 'json_object' };
    }

    if (tools && this.config.toolCalling !== false) body.tools = tools;
    if (toolChoice !== undefined) body.tool_choice = toolChoice;
    if (reasoning !== undefined && this.config.reasoning !== false) body.reasoning = normalizeReasoning(reasoning);

    const response = await fetch(`${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        ...(this.config.headers || {})
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Model ${this.config.name} returned HTTP ${response.status}: ${text.slice(0, 700)}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const content = typeof message?.content === 'string' ? message.content : contentFromParts(message?.content);
    if (!content) throw new Error(`Model ${this.config.name} returned no message content`);

    return {
      content,
      usage: normalizeUsage(data.usage, messages, content),
      toolCalls: message?.tool_calls || [],
      raw: data
    };
  }
}

function normalizeReasoning(reasoning) {
  if (typeof reasoning === 'string') return { effort: reasoning };
  return reasoning;
}

function contentFromParts(parts) {
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => {
    if (typeof part === 'string') return part;
    return part.text || part.content || '';
  }).filter(Boolean).join('\n');
}

function normalizeUsage(usage, messages, content) {
  if (!usage) return { inputTokens: approximateTokens(messages), outputTokens: approximateTokens(content) };
  return {
    inputTokens: usage.prompt_tokens ?? usage.input_tokens ?? approximateTokens(messages),
    outputTokens: usage.completion_tokens ?? usage.output_tokens ?? approximateTokens(content),
    totalTokens: usage.total_tokens ?? usage.totalTokens
  };
}

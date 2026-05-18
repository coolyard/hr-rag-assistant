import type { InjectionToken } from '@nestjs/common';

export interface LLMConfig {
  readonly model: string;
  readonly temperature: number;
  readonly topP: number;
  readonly topK: number;
  readonly maxTokens: number;
  readonly ollamaBaseUrl: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly stream: boolean;
}

export const LLM_CONFIG: InjectionToken = 'LLM_CONFIG';

export function createLLMConfig(): LLMConfig {
  return {
    model: process.env.LLM_MODEL ?? 'qwen2.5:7b-instruct',
    temperature: 0.3,
    topP: 0.9,
    topK: 40,
    maxTokens: 1024,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    timeout: Number(process.env.LLM_TIMEOUT) || 60000,
    maxRetries: Number(process.env.LLM_MAX_RETRIES) || 2,
    stream: true,
  };
}

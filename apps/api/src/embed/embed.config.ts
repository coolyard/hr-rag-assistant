import type { InjectionToken } from '@nestjs/common';

export interface EmbeddingConfig {
  readonly model: string;
  readonly dimensions: number;
  readonly normalize: boolean;
  readonly ollamaBaseUrl: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly batchSize: number;
}

export const EMBEDDING_CONFIG: InjectionToken = 'EMBEDDING_CONFIG';

export function createEmbeddingConfig(): EmbeddingConfig {
  return {
    model: process.env.EMBEDDING_MODEL ?? 'nomic-embed-text',
    dimensions: 768,
    normalize: true,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    timeout: Number(process.env.EMBEDDING_TIMEOUT) || 30000,
    maxRetries: Number(process.env.EMBEDDING_MAX_RETRIES) || 3,
    batchSize: Number(process.env.EMBEDDING_BATCH_SIZE) || 10,
  };
}

import { Injectable, Inject, Logger } from '@nestjs/common';
import axios from 'axios';

import { EMBEDDING_CONFIG, type EmbeddingConfig } from '@/embed/embed.config';
import type { IEmbeddingService } from '@/embed/embed.interface';

const MARKDOWN_SYMBOLS_PATTERN = /[#*`[\]()]/g;

@Injectable()
export class EmbeddingService implements IEmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(@Inject(EMBEDDING_CONFIG) private readonly config: EmbeddingConfig) {}

  async embed(text: string): Promise<number[]> {
    const cleaned = this.preprocessText(text);
    if (cleaned.length === 0) {
      return new Array<number>(this.config.dimensions).fill(0);
    }
    return this.callEmbeddingApi(cleaned);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const totalBatches = Math.ceil(texts.length / this.config.batchSize);

    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batchNumber = Math.floor(i / this.config.batchSize) + 1;
      const batch = texts.slice(i, i + this.config.batchSize);

      this.logger.log(
        `[Embedding] Processing batch ${String(batchNumber)}/${String(totalBatches)} (${String(Math.round((batchNumber / totalBatches) * 100))}%)...`,
      );

      const batchResults = await Promise.all(batch.map((t) => this.embed(t)));
      results.push(...batchResults);
    }

    this.logger.log(
      `[Embedding] Completed ${String(results.length)}/${String(texts.length)} embeddings generated`,
    );

    return results;
  }

  async healthCheck(): Promise<{ available: boolean; model: string }> {
    try {
      const result = await this.embed('health check');
      return { available: result.length === this.config.dimensions, model: this.config.model };
    } catch {
      return { available: false, model: this.config.model };
    }
  }

  private preprocessText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').replace(MARKDOWN_SYMBOLS_PATTERN, '').slice(0, 4000);
  }

  private async callEmbeddingApi(input: string): Promise<number[]> {
    const url = `${this.config.ollamaBaseUrl}/api/embeddings`;
    const body = { model: this.config.model, prompt: input };

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await axios.post<{ embedding: number[] }>(url, body, {
          timeout: this.config.timeout,
          headers: { 'Content-Type': 'application/json' },
        });

        const embedding = response.data.embedding;

        if (embedding.length !== this.config.dimensions) {
          throw new Error(
            `Dimension mismatch: expected ${String(this.config.dimensions)}, got ${String(embedding.length)}`,
          );
        }

        return embedding;
      } catch (error) {
        lastError = error;
        if (attempt < this.config.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `Embedding API attempt ${String(attempt + 1)} failed, retrying in ${String(delay)}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

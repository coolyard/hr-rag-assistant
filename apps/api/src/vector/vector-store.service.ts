import { Injectable, Logger } from '@nestjs/common';

import type { DocumentMeta, IVectorStore, SearchResult } from '@/vector/vector.interface';

const VECTOR_DIMENSION = 768;

@Injectable()
export class VectorStoreService implements IVectorStore {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly vectors = new Map<string, { embedding: number[]; metadata: DocumentMeta }>();

  add(id: string, embedding: number[], metadata: DocumentMeta): void {
    if (embedding.length !== VECTOR_DIMENSION) {
      throw new Error(
        `Dimension mismatch: expected ${String(VECTOR_DIMENSION)}, got ${String(embedding.length)}`,
      );
    }

    if (embedding.some((v) => !Number.isFinite(v))) {
      throw new Error('Embedding contains invalid values (NaN or Infinity)');
    }

    this.vectors.set(id, { embedding, metadata });
  }

  search(queryEmbedding: number[], topK: number): SearchResult[] {
    if (this.vectors.size === 0) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const [id, data] of this.vectors) {
      const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);

      results.push({
        chunkId: id,
        content: data.metadata.content,
        documentName: data.metadata.documentName,
        documentTitle: data.metadata.documentTitle,
        category: data.metadata.category,
        categoryName: data.metadata.categoryName,
        heading: data.metadata.heading,
        similarity,
        metadata: data.metadata,
      });
    }

    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, topK);
  }

  clear(): void {
    this.vectors.clear();
  }

  count(): number {
    return this.vectors.size;
  }

  get(id: string): { embedding: number[]; metadata: DocumentMeta } | null {
    return this.vectors.get(id) ?? null;
  }

  getAll(): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [id, data] of this.vectors) {
      results.push({
        chunkId: id,
        content: data.metadata.content,
        documentName: data.metadata.documentName,
        documentTitle: data.metadata.documentTitle,
        category: data.metadata.category,
        categoryName: data.metadata.categoryName,
        heading: data.metadata.heading,
        similarity: 0,
        metadata: data.metadata,
      });
    }

    return results;
  }

  logIndexSummary(): void {
    this.logger.log(`[VectorStore] 已建立 ${String(this.vectors.size)} 条 Embedding 索引`);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Dimension mismatch: ${String(a.length)} vs ${String(b.length)}`);
    }

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

import { Injectable, Logger } from '@nestjs/common';

import { EmbeddingService } from '@/embed/embed.service';
import { HR_KEYWORDS, KeywordSearchService } from '@/rag/keyword-search.service';
import type { MergedResult, RAGSearchResult } from '@/rag/rag.interface';
import { VectorStoreService } from '@/vector/vector-store.service';

const VECTOR_TOP_K = 3;
const KEYWORD_TOP_K = 3;
const MERGE_TOP_K = 3;
const SIMILARITY_THRESHOLD = 0.5;
const VECTOR_WEIGHT = 0.4;
const KEYWORD_WEIGHT = 0.6;

export const REJECTION_PHRASE =
  '根据现有 HR 文档，无法确认该问题的答案。建议联系 HR 部门获取准确信息。';

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: VectorStoreService,
    private readonly keywordSearch: KeywordSearchService,
  ) {}

  async orchestrate(query: string): Promise<MergedResult[]> {
    try {
      const vectorResults = await this.vectorSearch(query, VECTOR_TOP_K);
      const allChunks = this.vectorStore.getAll();
      const keywordResults = this.keywordSearch.search(query, allChunks, KEYWORD_TOP_K);

      const merged = this.mergeResults(vectorResults, keywordResults, MERGE_TOP_K);

      if (this.shouldReject(merged, query)) {
        this.logger.log(`Query rejected (below threshold or filtered): ${query}`);
        return [];
      }

      this.logger.log(
        `RAG orchestration complete: ${String(merged.length)} results for query "${query}"`,
      );

      return merged;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`RAG orchestration failed: ${message}`);
      throw error;
    }
  }

  private async vectorSearch(query: string, topK: number): Promise<RAGSearchResult[]> {
    const queryEmbedding = await this.embeddingService.embed(query);
    const results = this.vectorStore.search(queryEmbedding, topK);

    return results.map((r) => ({
      ...r,
      source: 'vector' as const,
      normalizedScore: r.similarity,
    }));
  }

  private mergeResults(
    vectorResults: RAGSearchResult[],
    keywordResults: RAGSearchResult[],
    topK: number,
  ): MergedResult[] {
    const merged = new Map<string, MergedResult>();

    for (const r of vectorResults) {
      merged.set(r.chunkId, {
        ...r,
        hybridScore: r.normalizedScore * VECTOR_WEIGHT,
        sources: ['vector'],
      });
    }

    for (const r of keywordResults) {
      const existing = merged.get(r.chunkId);
      if (existing) {
        existing.hybridScore += r.normalizedScore * KEYWORD_WEIGHT;
        existing.sources.push('keyword');
      } else {
        merged.set(r.chunkId, {
          ...r,
          hybridScore: r.normalizedScore * KEYWORD_WEIGHT,
          sources: ['keyword'],
        });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, topK);
  }

  private shouldReject(results: MergedResult[], query: string): boolean {
    if (results.length === 0 || results[0].hybridScore < SIMILARITY_THRESHOLD) {
      return true;
    }

    const hasKeywordMatch = results.some((r) => r.sources.includes('keyword'));
    const bestVectorScore =
      results.filter((r) => r.sources.includes('vector')).map((r) => r.similarity)[0] || 0;
    if (!hasKeywordMatch && bestVectorScore < SIMILARITY_THRESHOLD) {
      return true;
    }

    const privacyPatterns: RegExp[] = [
      /[一-龥]{2,4}的(工资|薪资|薪酬|收入)/,
      /(张三|李四|王五)的(工资|薪资)/,
      /具体员工/,
    ];
    if (privacyPatterns.some((p) => p.test(query))) {
      return true;
    }

    const secretPatterns: RegExp[] = [/裁员/, /收购|并购/, /季度财报.*未公布/];
    if (secretPatterns.some((p) => p.test(query))) {
      return true;
    }

    const hrRelatedKeywords = [...HR_KEYWORDS, '公司', '制度', '政策', '流程', '规定'];
    const isHrRelated = hrRelatedKeywords.some((kw) => query.includes(kw));
    if (!isHrRelated && results[0].hybridScore < 0.6) {
      return true;
    }

    return false;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import MiniSearch from 'minisearch';
import type { Options as MiniSearchOptions, SearchResult as MiniSearchResult } from 'minisearch';

import type { RAGSearchResult } from '@/rag/rag.interface';
import { expandQuery } from '@/rag/synonyms';
import type { SearchResult } from '@/vector/vector.interface';

export const HR_KEYWORDS = [
  '年假',
  '年休假',
  '带薪休假',
  '请假',
  '休假',
  '报销',
  '发票',
  '差旅',
  '交通费',
  '住宿费',
  '通讯补贴',
  '补贴',
  '交通补贴',
  '餐补',
  '食补',
  '饭贴',
  '午餐补贴',
  '餐饮补贴',
  '晋升',
  '升职',
  '考核',
  '绩效',
  '评估',
  '调薪',
  '考勤',
  '打卡',
  '迟到',
  '早退',
  '旷工',
  '加班',
  '弹性工作',
  '福利',
  '社保',
  '公积金',
  '医疗保险',
  '体检',
  '节日',
  '工资',
  '薪资',
  '薪酬',
  '离职',
  '入职',
  '转正',
  '劳动合同',
];

/** MiniSearch 索引文档结构 */
interface IndexedDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  heading: string;
  documentTitle: string;
  categoryName: string;
  ref: SearchResult;
}

const MINISEARCH_OPTIONS: MiniSearchOptions = {
  fields: ['title', 'content', 'category'],
  storeFields: ['id', 'heading', 'documentTitle', 'categoryName'],
  searchOptions: {
    boost: { title: 3, content: 1.5, category: 1 },
    prefix: true,
    fuzzy: 0.2,
  },
};

@Injectable()
export class KeywordSearchService {
  private readonly logger = new Logger(KeywordSearchService.name);
  private miniSearch: MiniSearch<IndexedDoc> | null = null;
  private indexedChunks: Map<string, SearchResult> = new Map();

  /**
   * 构建 BM25 索引（在文档加载完成后调用一次）
   */
  buildIndex(chunks: SearchResult[]): void {
    this.logger.log(`Building BM25 index with ${String(chunks.length)} documents...`);
    this.indexedChunks.clear();
    this.miniSearch = new MiniSearch<IndexedDoc>(MINISEARCH_OPTIONS);

    const docs: IndexedDoc[] = chunks.map((chunk, idx) => {
      const id = String(idx);
      this.indexedChunks.set(id, chunk);
      return {
        id,
        title: `${chunk.heading} ${chunk.documentTitle}`,
        content: chunk.content,
        category: chunk.categoryName,
        heading: chunk.heading,
        documentTitle: chunk.documentTitle,
        categoryName: chunk.categoryName,
        ref: chunk,
      };
    });

    this.miniSearch.addAll(docs);
    this.logger.log(`BM25 index built: ${String(this.miniSearch.documentCount)} documents indexed`);
  }

  /**
   * BM25 关键词检索（带同义词扩展）
   *
   * @param query 原始用户查询
   * @param topK 返回结果数
   * @returns BM25 排序后的结果（normalizedScore 归一化到 [0, 1]）
   *
   * 索引未构建时返回空数组
   */
  search(query: string, topK: number): RAGSearchResult[] {
    if (!this.miniSearch || this.miniSearch.documentCount === 0) {
      this.logger.warn('BM25 index not built, returning empty results');
      return [];
    }

    // 同义词扩展
    const expandedQuery = expandQuery(query);
    if (expandedQuery !== query) {
      this.logger.log(`Query expanded with synonyms: "${query}" → "${expandedQuery}"`);
    }

    // 执行 BM25 搜索
    const raw: MiniSearchResult[] = this.miniSearch.search(expandedQuery, {
      prefix: true,
      fuzzy: 0.2,
    });

    const top = raw.slice(0, topK);
    if (top.length === 0) return [];

    // 映射为 RAGSearchResult（用 similarity 暂存 BM25 原始分数）
    const results: RAGSearchResult[] = top
      .map((r) => {
        const id = String(r.id);
        const chunk = this.indexedChunks.get(id);
        if (!chunk) return null;
        return {
          ...chunk,
          source: 'keyword' as const,
          similarity: r.score,
          normalizedScore: r.score,
        };
      })
      .filter((r): r is RAGSearchResult => r !== null);

    // Min-Max 归一化到 [0, 1]
    return this.normalizeScores(results);
  }

  /**
   * Min-Max 分数归一化
   */
  private normalizeScores(results: RAGSearchResult[]): RAGSearchResult[] {
    if (results.length === 0) return results;
    const scores = results.map((r) => r.similarity);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    if (max === min) {
      return results.map((r) => ({ ...r, normalizedScore: 1.0 }));
    }
    return results.map((r) => ({
      ...r,
      normalizedScore: (r.similarity - min) / (max - min),
    }));
  }

  /**
   * 检查索引是否已构建
   */
  isReady(): boolean {
    return this.miniSearch !== null && this.miniSearch.documentCount > 0;
  }
}

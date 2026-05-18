import type { DocumentMeta, SearchResult } from '@/vector/vector.interface';

export interface RAGSearchResult extends SearchResult {
  source: 'vector' | 'keyword';
  normalizedScore: number;
}

export interface MergedResult extends RAGSearchResult {
  hybridScore: number;
  sources: Array<'vector' | 'keyword'>;
}

export type { DocumentMeta, SearchResult };

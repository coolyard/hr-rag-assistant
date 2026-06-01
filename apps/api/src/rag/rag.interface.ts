import type { DocumentMeta, SearchResult } from '@/vector/vector.interface';

export interface RAGSearchResult extends SearchResult {
  source: 'vector' | 'keyword';
  normalizedScore: number;
}

export interface MergedResult extends RAGSearchResult {
  hybridScore: number;
  sources: Array<'vector' | 'keyword'>;
}

export interface SourceCitation {
  documentName: string;
  documentTitle: string;
  category: string;
  chunk: string;
  similarity: number;
}

export interface StreamChunk {
  token: string;
  done: boolean;
  status?: string;
  followUps?: string[];
  sources?: SourceCitation[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  error?: string;
}

export type { DocumentMeta, SearchResult };

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
  reasoning?: string;
  followUps?: string[];
  sources?: SourceCitation[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
  retrievalDetail?: RetrievalDetail;
  toolCallStart?: ToolCallStart;
  toolResult?: ToolResult;
}

export interface ToolCallStart {
  id: string;
  name: string;
  title: string;
  args: Record<string, unknown>;
  confirmRequired: boolean;
}

export interface ToolResult {
  id: string;
  result: string | Record<string, unknown>;
  error?: string;
}

export interface SourceItem {
  documentTitle: string;
  similarity: number;
  source: 'vector' | 'keyword';
}

export interface RetrievalDetail {
  vectorCount: number;
  keywordCount: number;
  mergedCount: number;
  vectorSources: SourceItem[];
  keywordSources: SourceItem[];
}

export type { DocumentMeta, SearchResult };

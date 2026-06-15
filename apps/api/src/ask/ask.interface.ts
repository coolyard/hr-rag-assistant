import type { SourceCitation } from '@/rag/rag.interface';

export interface AskRequest {
  question: string;
  conversationId?: string;
}

export interface AskStreamChunk {
  chunk: string;
  done: boolean;
  status?: string;
  reasoning?: string;
  followUps?: string[];
  sources?: SourceCitation[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  error?: string;
  conversationId?: string;
}

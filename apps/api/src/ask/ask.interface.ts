import type { SourceCitation } from '@/rag/rag.interface';

export interface AskRequest {
  question: string;
  conversationId?: string;
}

export interface AskStreamChunk {
  chunk: string;
  done: boolean;
  status?: string;
  followUps?: string[];
  sources?: SourceCitation[];
  error?: string;
  conversationId?: string;
}

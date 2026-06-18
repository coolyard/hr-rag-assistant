import type { RetrievalDetail, SourceCitation } from '@/rag/rag.interface';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: SourceCitation[];
  reasoning?: string;
  retrievalDetail?: RetrievalDetail;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

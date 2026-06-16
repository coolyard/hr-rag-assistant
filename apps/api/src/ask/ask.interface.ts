import type { SourceCitation } from '@/rag/rag.interface';

export interface AskRequest {
  question: string;
  toolCallStart?: {
    id: string;
    name: string;
    title: string;
    args: Record<string, unknown>;
    confirmRequired: boolean;
  };
  toolResult?: { id: string; result: string | Record<string, unknown>; error?: string };
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
  promptTokens?: number;
  completionTokens?: number;
  toolCallStart?: {
    id: string;
    name: string;
    title: string;
    args: Record<string, unknown>;
    confirmRequired: boolean;
  };
  toolResult?: { id: string; result: string | Record<string, unknown>; error?: string };
  conversationId?: string;
}

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

export interface SourceCitation {
  documentName: string;
  documentTitle: string;
  category: string;
  chunk: string;
  similarity: number;
}

export async function* streamAsk(
  request: AskRequest,
  signal?: AbortSignal,
): AsyncGenerator<AskStreamChunk> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('hr_rag_token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch('/api/ask', {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${String(response.status)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const json = line.slice(6);
          if (json.length > 0) {
            yield JSON.parse(json) as AskStreamChunk;
          }
        }
      }
    }
  }
}

/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { useCallback, useRef, useState } from 'react';

import { client } from '@/api/client';
import { streamAsk } from '@/api/sse';
import type { SourceCitation } from '@/api/sse';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: SourceCitation[];
  followUps?: string[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  error?: string;
  reasoning?: string;
}

function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${String(ts)}-${rand}`;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (content.trim().length === 0 || loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      const convId = conversationId ?? generateId('conv');
      if (!conversationId) {
        setConversationId(convId);
      }

      const userMsg: Message = {
        id: generateId('msg'),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
        status: 'complete',
      };

      const assistantMsg: Message = {
        id: generateId('msg'),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInputValue('');
      setIsLoading(true);
      setStatusText('正在理解您的问题...');

      const abortController = new AbortController();
      abortRef.current = abortController;

      let accumulated = '';
      let rafId: number | null = null;
      let pendingTokens: string[] = [];

      const flushTokens = () => {
        if (pendingTokens.length === 0) {
          rafId = null;
          return;
        }
        const batch = pendingTokens.join('');
        pendingTokens = [];
        accumulated += batch;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: accumulated, status: 'streaming' as const }
              : m,
          ),
        );
        rafId = null;
      };

      try {
        for await (const chunk of streamAsk(
          { question: content.trim(), conversationId: convId },
          abortController.signal,
        )) {
          if (chunk.status) {
            setStatusText(chunk.status);
          }

          if (chunk.followUps) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id ? { ...m, followUps: chunk.followUps } : m,
              ),
            );
          }

          if (chunk.reasoning) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, reasoning: (m.reasoning ?? '') + chunk.reasoning }
                  : m,
              ),
            );
          }

          if (chunk.chunk) {
            pendingTokens.push(chunk.chunk);
            if (rafId === null) {
              rafId = requestAnimationFrame(flushTokens);
            }
          }

          if (chunk.done) {
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              flushTokens();
            }

            const finalStatus: 'complete' | 'error' = chunk.error ? 'error' : 'complete';
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content: accumulated,
                      sources: chunk.sources,
                      confidenceLevel: chunk.confidenceLevel,
                      hallucinationWarning: chunk.hallucinationWarning,
                      status: finalStatus,
                      error: chunk.error,
                    }
                  : m,
              ),
            );
            break;
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            flushTokens();
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    status: 'error' as const,
                    error: error instanceof Error ? error.message : '发送失败',
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        setStatusText('');
        loadingRef.current = false;
        abortRef.current = null;
      }
    },
    [conversationId],
  );

  const retryMessage = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.role !== 'user') {
        return;
      }
      setMessages((prev) => prev.slice(0, -1));
      void sendMessage(msg.content);
    },
    [messages, sendMessage],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setIsLoading(false);
    loadingRef.current = false;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const newConversation = useCallback(() => {
    clearConversation();
  }, [clearConversation]);

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await client.get(`/conversations/${convId}/messages`);
      const msgs = Array.isArray(res.data) ? (res.data as Message[]) : [];
      setMessages(
        msgs.map((m) => ({
          ...m,
          timestamp:
            typeof m.timestamp === 'string' ? new Date(m.timestamp).getTime() : m.timestamp,
        })),
      );
      setConversationId(convId);
    } catch {
      setMessages([]);
    }
  }, []);

  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    statusText,
    sendMessage,
    retryMessage,
    clearConversation,
    conversationId,
    newConversation,
    loadConversation,
  };
}

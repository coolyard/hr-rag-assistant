import { useCallback, useRef, useState } from 'react';

import { client } from '@/api/client';
import { streamAsk } from '@/api/sse';
import type { SourceCitation } from '@/api/sse';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'toolCall' | 'toolResult';
  content: string;
  timestamp: number;
  sources?: SourceCitation[];
  followUps?: string[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error' | 'stopped';
  error?: string;
  reasoning?: string;
  promptTokens?: number;
  completionTokens?: number;
  toolCall?: {
    id: string;
    name: string;
    title: string;
    args: Record<string, unknown>;
    confirmRequired: boolean;
  };
  toolResult?: {
    id: string;
    result: string | Record<string, unknown>;
    error?: string;
  };
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

          if (chunk.toolCallStart) {
            const toolMsg: Message = {
              id: generateId('tc'),
              role: 'toolCall',
              content: '',
              timestamp: Date.now(),
              toolCall: chunk.toolCallStart,
              status: 'complete',
            };
            // 移除初始的 loading assistant 消息，用 toolCall 消息替代
            setMessages((prev) => {
              const withoutLoading = prev.filter(
                (m) => !(m.role === 'assistant' && m.id === assistantMsg.id && m.content === ''),
              );
              return [...withoutLoading, toolMsg];
            });
            setIsLoading(false);
            setStatusText('');
            loadingRef.current = false;
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
            }
            return;
          }

          if (chunk.reasoning) {
            const reasoningText: string = chunk.reasoning;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, reasoning: (m.reasoning ?? '') + reasoningText }
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
                      promptTokens: chunk.promptTokens,
                      completionTokens: chunk.completionTokens,
                    }
                  : m,
              ),
            );
            break;
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // 用户主动停止：刷新已缓冲的 token，标记为 stopped
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            flushTokens();
          }
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, status: 'stopped' as const } : m)),
          );
        } else {
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

  const confirmToolCall = useCallback(
    async (toolCallId: string, toolName: string, args: Record<string, unknown>) => {
      const token = localStorage.getItem('hr_rag_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch('/api/ask/tool/execute', {
        method: 'POST',
        headers,
        body: JSON.stringify({ toolCallId, toolName, args }),
      });
      const result = (await res.json()) as { result: string; error?: string };
      const resultMsg: Message = {
        id: generateId('tr'),
        role: 'toolResult',
        content: result.error != null ? `执行失败: ${result.error}` : result.result,
        timestamp: Date.now(),
        toolResult: { id: toolCallId, result: result.result },
        status: 'complete',
      };
      setMessages((prev) => [...prev, resultMsg]);
    },
    [],
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

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const regenerate = useCallback(
    (assistantMsgId: string) => {
      const idx = messages.findIndex((m) => m.id === assistantMsgId);
      if (idx <= 0) {
        return;
      }
      const userMsg = [...messages.slice(0, idx)].reverse().find((m: Message) => m.role === 'user');
      if (!userMsg) {
        return;
      }
      // Remove the current assistant message
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
      loadingRef.current = false;
      setIsLoading(false);
      void sendMessage(userMsg.content);
    },
    [messages, sendMessage],
  );

  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    statusText,
    sendMessage,
    stopGeneration,
    retryMessage,
    regenerate,
    clearConversation,
    conversationId,
    confirmToolCall,
    newConversation,
    loadConversation,
  };
}

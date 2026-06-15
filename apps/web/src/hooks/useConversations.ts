import { useCallback, useState } from 'react';
import { client } from '@/api/client';

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt: number;
  messages: Array<{ content: string }>;
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchList = useCallback(async () => {
    try {
      const res = await client.get<ConversationItem[]>('/conversations');
      const data = Array.isArray(res.data) ? res.data : [];
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConversation = useCallback(async () => {
    try {
      const res = await client.post<ConversationItem>('/conversations');
      const data = res.data;
      setConversations((prev) => [data, ...prev]);
      setActiveConvId(data.id);
      return data;
    } catch {
      return null;
    }
  }, []);

  const renameConversation = useCallback(async (id: string, title: string) => {
    await client.patch(`/conversations/${id}`, { title });
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      await client.delete(`/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
      }
    },
    [activeConvId],
  );

  const selectConversation = useCallback((id: string) => {
    setActiveConvId(id);
  }, []);

  return {
    conversations,
    activeConvId,
    isLoading,
    fetchList,
    createConversation,
    renameConversation,
    deleteConversation,
    selectConversation,
    setActiveConvId,
  };
}

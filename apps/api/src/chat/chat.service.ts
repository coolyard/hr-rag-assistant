import { Injectable } from '@nestjs/common';

import type { Conversation, Message } from '@/chat/chat.interface';
import { ConversationStoreService } from '@/chat/conversation-store.service';
import type { RetrievalDetail, SourceCitation } from '@/rag/rag.interface';

function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${String(ts)}-${rand}`;
}

@Injectable()
export class ChatService {
  constructor(private readonly store: ConversationStoreService) {}

  async getOrCreateConversation(conversationId?: string, userId?: string): Promise<Conversation> {
    if (conversationId) {
      const existing = await this.store.getConversation(conversationId);
      if (existing) {
        return existing;
      }
    }
    if (conversationId) {
      return this.store.createConversation('', userId ?? 'anonymous', conversationId);
    }
    return this.store.createConversation('', userId ?? 'anonymous');
  }

  async getHistory(conversationId: string): Promise<Message[]> {
    return this.store.getMessages(conversationId);
  }

  async addUserMessage(convId: string, content: string): Promise<Message> {
    const message: Message = {
      id: generateId('msg'),
      role: 'user',
      content,
      timestamp: Date.now(),
      status: 'complete',
    };
    await this.store.addMessage(convId, message);

    const conv = await this.store.getConversation(convId);
    if (conv && conv.title.length === 0) {
      await this.store.updateConversationTitle(convId, content.slice(0, 20));
    }

    return message;
  }

  async addAssistantMessage(
    convId: string,
    content: string,
    sources?: SourceCitation[],
    reasoning?: string,
    retrievalDetail?: RetrievalDetail
  ): Promise<Message> {
    const message: Message = {
      id: generateId('msg'),
      role: 'assistant',
      content,
      timestamp: Date.now(),
      sources,
      reasoning,
      retrievalDetail,
      status: 'complete',
    };
    await this.store.addMessage(convId, message);
    return message;
  }
}

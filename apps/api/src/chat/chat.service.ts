import { Injectable } from '@nestjs/common';

import type { Conversation, Message } from '@/chat/chat.interface';
import { ConversationStoreService } from '@/chat/conversation-store.service';
import type { SourceCitation } from '@/rag/rag.interface';

function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${String(ts)}-${rand}`;
}

@Injectable()
export class ChatService {
  constructor(private readonly store: ConversationStoreService) {}

  getOrCreateConversation(conversationId?: string): Conversation {
    if (conversationId) {
      const existing = this.store.getConversation(conversationId);
      if (existing) {
        return existing;
      }
    }
    return this.store.createConversation('');
  }

  getHistory(conversationId: string): Message[] {
    return this.store.getMessages(conversationId);
  }

  addUserMessage(convId: string, content: string): Message {
    const message: Message = {
      id: generateId('msg'),
      role: 'user',
      content,
      timestamp: Date.now(),
      status: 'complete',
    };
    this.store.addMessage(convId, message);

    const conv = this.store.getConversation(convId);
    if (conv && conv.title.length === 0) {
      conv.title = content.slice(0, 20);
    }

    return message;
  }

  addAssistantMessage(convId: string, content: string, sources?: SourceCitation[]): Message {
    const message: Message = {
      id: generateId('msg'),
      role: 'assistant',
      content,
      timestamp: Date.now(),
      sources,
      status: 'complete',
    };
    this.store.addMessage(convId, message);
    return message;
  }
}

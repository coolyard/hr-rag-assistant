import { Injectable } from '@nestjs/common';

import type { Conversation } from '@/chat/chat.interface';
import type { Message } from '@/chat/chat.interface';

const MAX_MESSAGES = 10;

function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${String(ts)}-${rand}`;
}

@Injectable()
export class ConversationStoreService {
  private readonly store = new Map<string, Conversation>();

  createConversation(title: string): Conversation {
    const conv: Conversation = {
      id: generateId('conv'),
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.store.set(conv.id, conv);
    return conv;
  }

  getConversation(id: string): Conversation | null {
    return this.store.get(id) ?? null;
  }

  addMessage(convId: string, message: Message): void {
    const conv = this.store.get(convId);
    if (!conv) {
      return;
    }
    conv.messages.push(message);
    conv.updatedAt = Date.now();

    if (conv.messages.length > MAX_MESSAGES) {
      conv.messages = conv.messages.slice(-MAX_MESSAGES);
    }
  }

  getMessages(convId: string): Message[] {
    const conv = this.store.get(convId);
    return conv ? [...conv.messages] : [];
  }

  clearConversation(convId: string): void {
    const conv = this.store.get(convId);
    if (conv) {
      conv.messages = [];
      conv.updatedAt = Date.now();
    }
  }
}

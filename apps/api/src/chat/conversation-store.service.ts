import { Injectable } from '@nestjs/common';

import type { Conversation, Message } from '@/chat/chat.interface';
import { PrismaService } from '@/prisma/prisma.service';

const MAX_MESSAGES = 10;

function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${String(ts)}-${rand}`;
}

@Injectable()
export class ConversationStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(title: string, userId: string = 'anonymous'): Promise<Conversation> {
    const id = generateId('conv');
    const now = Date.now();
    await this.prisma.conversation.create({
      data: {
        id,
        title,
        userId,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      },
    });
    return { id, title, messages: [], createdAt: now, updatedAt: now };
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { timestamp: 'asc' } } },
    });
    if (!conv) return null;
    return {
      id: conv.id,
      title: conv.title,
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role as Message['role'],
        content: m.content,
        timestamp: m.timestamp.getTime(),
        sources: m.sources ? (JSON.parse(m.sources) as Message["sources"]) : undefined,
        status: m.status as Message['status'],
        error: m.error ?? undefined,
      })),
      createdAt: conv.createdAt.getTime(),
      updatedAt: conv.updatedAt.getTime(),
    };
  }

  async addMessage(convId: string, message: Message): Promise<void> {
    await this.prisma.message.create({
      data: {
        id: message.id,
        conversationId: convId,
        role: message.role,
        content: message.content,
        reasoning: (message as { reasoning?: string }).reasoning ?? '',
        sources: message.sources ? JSON.stringify(message.sources) : null,
        status: message.status ?? 'complete',
        error: message.error ?? null,
        timestamp: new Date(message.timestamp),
      },
    });

    await this.prisma.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    // Trim old messages
    const msgCount = await this.prisma.message.count({
      where: { conversationId: convId },
    });
    if (msgCount > MAX_MESSAGES) {
      const toDelete = msgCount - MAX_MESSAGES;
      const oldest = await this.prisma.message.findMany({
        where: { conversationId: convId },
        orderBy: { timestamp: 'asc' },
        take: toDelete,
      });
      await this.prisma.message.deleteMany({
        where: { id: { in: oldest.map((m) => m.id) } },
      });
    }
  }

  async getMessages(convId: string): Promise<Message[]> {
    const msgs = await this.prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { timestamp: 'asc' },
    });
    return msgs.map((m) => ({
      id: m.id,
      role: m.role as Message['role'],
      content: m.content,
      timestamp: m.timestamp.getTime(),
      sources: m.sources ? (JSON.parse(m.sources) as Message["sources"]) : undefined,
      status: m.status as Message['status'],
      error: m.error ?? undefined,
    }));
  }

  async clearConversation(convId: string): Promise<void> {
    await this.prisma.message.deleteMany({
      where: { conversationId: convId },
    });
  }

  async findConversationsByUser(userId: string): Promise<Conversation[]> {
    const convs = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return convs.map((c) => ({
      id: c.id,
      title: c.title,
      messages: [],
      createdAt: c.createdAt.getTime(),
      updatedAt: c.updatedAt.getTime(),
    }));
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: { title, updatedAt: new Date() },
    });
  }

  async deleteConversation(id: string): Promise<void> {
    await this.prisma.conversation.delete({ where: { id } });
  }
}

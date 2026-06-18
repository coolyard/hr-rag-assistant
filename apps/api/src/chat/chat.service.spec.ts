import { Test, type TestingModule } from '@nestjs/testing';

import { ChatService } from '@/chat/chat.service';
import { ConversationStoreService } from '@/chat/conversation-store.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('ChatService', () => {
  let service: ChatService;
  const convStore = new Map<
    string,
    { id: string; title: string; createdAt: Date; updatedAt: Date; userId: string }
  >();
  const msgStore: Array<{ id: string; conversationId: string; role: string; content: string }> = [];

  beforeEach(async () => {
    convStore.clear();
    msgStore.length = 0;
    // Track created conversations and messages in-memory for mock

    const mockPrismaService = {
      conversation: {
        create: jest
          .fn()
          .mockImplementation((args: { data: { id: string; title: string; userId: string } }) => {
            const now = new Date();
            const conv = {
              id: args.data.id,
              title: args.data.title,
              createdAt: now,
              updatedAt: now,
              userId: args.data.userId,
            };
            convStore.set(conv.id, conv);
            return Promise.resolve(conv);
          }),
        findUnique: jest.fn().mockImplementation((args: { where: { id: string } }) => {
          const conv = convStore.get(args.where.id);
          return Promise.resolve(conv ? { ...conv, messages: [] } : null);
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest
          .fn()
          .mockImplementation(
            (args: { where: { id: string }; data: { title?: string; updatedAt?: Date } }) => {
              const conv = convStore.get(args.where.id);
              if (conv && args.data.title) {
                conv.title = args.data.title;
                conv.updatedAt = args.data.updatedAt ?? new Date();
              }
              return Promise.resolve(conv ?? {});
            },
          ),
        delete: jest.fn().mockResolvedValue({}),
      },
      message: {
        create: jest
          .fn()
          .mockImplementation(
            (args: {
              data: { id: string; conversationId: string; role: string; content: string };
            }) => {
              msgStore.push(args.data);
              return Promise.resolve({});
            },
          ),
        findMany: jest.fn().mockImplementation(() =>
          Promise.resolve(
            msgStore.map((m) => ({
              id: m.id,
              conversationId: m.conversationId,
              role: m.role,
              content: m.content,
              timestamp: new Date(),
              sources: null,
              status: 'complete',
              error: null,
            })),
          ),
        ),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockImplementation(() => Promise.resolve(msgStore.length)),
      },
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        ConversationStoreService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('getOrCreateConversation 应返回同一个 conversation', async () => {
    const conv1 = await service.getOrCreateConversation('test-conv');
    const conv2 = await service.getOrCreateConversation(conv1.id);
    expect(conv1.id).toBe(conv2.id);
  });

  it('getOrCreateConversation 无 ID 时应创建新会话', async () => {
    const conv = await service.getOrCreateConversation();
    expect(conv).toBeDefined();
    expect(conv.id).toBeDefined();
  });

  it('addUserMessage 应添加用户消息', async () => {
    const conv = await service.getOrCreateConversation('test-conv');
    await service.addUserMessage(conv.id, '年假怎么请');
    const history = await service.getHistory(conv.id);
    expect(history).toHaveLength(1);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('年假怎么请');
  });

  it('addUserMessage 应设置 conversation 标题', async () => {
    const conv = await service.getOrCreateConversation('test-conv');
    await service.addUserMessage(conv.id, '年假怎么请');
    const refreshedConv = await service.getOrCreateConversation(conv.id);
    expect(refreshedConv.title).toBe('年假怎么请');
  });

  it('addAssistantMessage 应添加助手消息', async () => {
    const conv = await service.getOrCreateConversation('test-conv');
    await service.addUserMessage(conv.id, '年假怎么请');
    await service.addAssistantMessage(conv.id, '根据年假制度...', []);
    const history = await service.getHistory(conv.id);
    expect(history).toHaveLength(2);
    expect(history[1].role).toBe('assistant');
    expect(history[1].content).toBe('根据年假制度...');
  });

  it('getHistory 对不存在的会话应返回空数组', async () => {
    const history = await service.getHistory('nonexist');
    expect(history).toEqual([]);
  });
});

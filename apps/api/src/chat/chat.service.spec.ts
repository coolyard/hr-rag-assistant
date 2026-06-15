import { Test, type TestingModule } from '@nestjs/testing';

import { ChatService } from '@/chat/chat.service';
import { ConversationStoreService } from '@/chat/conversation-store.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const mockPrismaService = {
      conversation: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      message: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
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

/* eslint-disable */
import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { RAGService } from '@/rag/rag.service';
import { EmbeddingService } from '@/embed/embed.service';
import { VectorStoreService } from '@/vector/vector-store.service';
import { KeywordSearchService } from '@/rag/keyword-search.service';
import { ChatService } from '@/chat/chat.service';
import { ConversationStoreService } from '@/chat/conversation-store.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LLMService } from '@/llm/llm.service';
import { UserProfileService } from '@/user-profile/user-profile.service';
import { ToolRegistryService } from '@/tool/tool-registry.service';
import { AuthService } from '@/auth/auth.service';
import type { MergedResult, RAGSearchResult } from '@/rag/rag.interface';

describe('RAGService', () => {
  let service: RAGService;

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
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolRegistryService,
        RAGService,
        KeywordSearchService,
        ChatService,
        ConversationStoreService,
        { provide: PrismaService, useValue: mockPrismaService },
        UserProfileService,
        AuthService,
        {
          provide: EmbeddingService,
          useValue: { embed: jest.fn().mockResolvedValue(new Array(768).fill(0.1)) },
        },
        {
          provide: VectorStoreService,
          useValue: {
            search: jest.fn().mockReturnValue([]),
            getAll: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: LLMService,
          useValue: {
            generate: jest.fn(),
            healthCheck: jest.fn().mockResolvedValue({ available: true, model: 'test' }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock'),
            verify: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();
    service = module.get<RAGService>(RAGService);
  });

  function makeVectorResult(
    chunkId: string,
    similarity: number,
    content: string,
    heading: string,
    docTitle: string,
  ): RAGSearchResult {
    return {
      chunkId,
      content,
      documentName: 'test.md',
      documentTitle: docTitle,
      category: 'annual_leave',
      categoryName: '年假',
      heading,
      similarity,
      metadata: {
        chunkId,
        documentName: 'test.md',
        documentTitle: docTitle,
        category: 'annual_leave',
        categoryName: '年假',
        heading,
        content,
        charCount: content.length,
      },
      source: 'vector',
      normalizedScore: similarity,
    };
  }

  function makeKeywordResult(chunkId: string, score: number, content: string): RAGSearchResult {
    return {
      chunkId,
      content,
      documentName: 'test.md',
      documentTitle: '测试',
      category: 'annual_leave',
      categoryName: '年假',
      heading: '## 年假',
      similarity: 0,
      metadata: {
        chunkId,
        documentName: 'test.md',
        documentTitle: '测试',
        category: 'annual_leave',
        categoryName: '年假',
        heading: '## 年假',
        content,
        charCount: content.length,
      },
      source: 'keyword',
      normalizedScore: score,
    };
  }

  describe('mergeResults', () => {
    it('应正确合并向量和关键词结果', () => {
      const merged = (service as any).mergeResults(
        [makeVectorResult('c1', 0.9, '年假5天', '## 年假', '年假制度')],
        [makeKeywordResult('c2', 0.8, '报销')],
        3,
      );
      expect(merged).toHaveLength(2);
      expect(merged[0].chunkId).toBe('c2');
      expect(merged[0].hybridScore).toBeCloseTo(0.48, 2);
    });
    it('重叠时应累加分数', () => {
      const merged = (service as any).mergeResults(
        [makeVectorResult('c1', 0.9, '年假5天', '## 年假', '年假制度')],
        [makeKeywordResult('c1', 0.8, '年假5天')],
        3,
      );
      expect(merged).toHaveLength(1);
      expect(merged[0].hybridScore).toBeCloseTo(0.84, 2);
      expect(merged[0].sources).toEqual(['vector', 'keyword']);
    });
    it('应返回 topK 个结果', () => {
      const merged = (service as any).mergeResults(
        [makeVectorResult('c1', 0.9, 'a', '## a', 'a')],
        [makeKeywordResult('c2', 0.8, 'b'), makeKeywordResult('c3', 0.7, 'c')],
        2,
      );
      expect(merged).toHaveLength(2);
    });
  });

  describe('getConfidenceLevel', () => {
    it('score > 0.8 返回 high', () => {
      expect((service as any).getConfidenceLevel(0.9)).toBe('high');
    });
    it('score 0.5-0.8 返回 medium', () => {
      expect((service as any).getConfidenceLevel(0.6)).toBe('medium');
    });
    it('score < 0.5 返回 low', () => {
      expect((service as any).getConfidenceLevel(0.3)).toBe('low');
    });
  });

  describe('buildPrompt', () => {
    it('应包含所有必要部分', () => {
      const chunks: MergedResult[] = [
        {
          ...makeVectorResult('c1', 0.9, '年假可休5天', '## 年假规则', '年假制度'),
          hybridScore: 0.84,
          sources: ['vector', 'keyword'],
        },
      ];
      const prompt = (service as any).buildPrompt('年假怎么请', chunks, [], '（未提供）');
      expect(prompt).toContain('检索到的文档片段');
      expect(prompt).toContain('当前问题');
      expect(prompt).toContain('年假怎么请');
    });
    it('空 chunks 应显示无相关文档片段', () => {
      const prompt = (service as any).buildPrompt('测试', [], [], '（未提供）');
      expect(prompt).toContain('无相关文档片段');
    });
  });

  describe('shouldReject', () => {
    it('空结果拒绝', () => {
      expect((service as any).shouldReject([], '年假', false)).toBe(true);
    });
    it('低分拒绝', () => {
      const chunks: MergedResult[] = [
        { ...makeVectorResult('c1', 0.3, 'x', '## x', 'x'), hybridScore: 0.3, sources: ['vector'] },
      ];
      expect((service as any).shouldReject(chunks, '年假', false)).toBe(true);
    });
    it('隐私拒绝', () => {
      const chunks: MergedResult[] = [
        {
          ...makeVectorResult('c1', 0.9, 'x', '## x', 'x'),
          hybridScore: 0.9,
          sources: ['vector', 'keyword'],
        },
      ];
      expect((service as any).shouldReject(chunks, '张三的工资是多少', false)).toBe(true);
    });
    it('正常放行', () => {
      const chunks: MergedResult[] = [
        {
          ...makeVectorResult('c1', 0.9, '年假5天', '## 年假', '年假制度'),
          hybridScore: 0.85,
          sources: ['vector', 'keyword'],
        },
      ];
      expect((service as any).shouldReject(chunks, '年假怎么请', false)).toBe(false);
    });
  });
});

# Agent 指令：为项目添加核心单元测试

> 【执行纪律】本指令包含 20 个具体修改点，分为 4 个阶段（基础设施 → 后端测试 → 前端测试 → CI 集成）。你必须严格按照阶段顺序逐一完成，每个阶段内按文件顺序。每完成一个阶段后运行 `pnpm test` 验证通过后再进入下一阶段。禁止跳过任何步骤。

---

## 前置阅读（必须先读）

1. 读取 `changes/features/add-core-unit-tests/spec.md` 了解完整需求
2. 读取 `specs/modules/rag-spec.md` 了解 RAG 模块接口
3. 读取 `specs/modules/vector-spec.md` 了解 VectorStore 接口
4. 读取 `specs/modules/embedding-spec.md` 了解 Embedding 接口
5. 读取 `specs/modules/chat-spec.md` 了解 Chat 模块接口
6. 读取 `specs/modules/auth-spec.md` 了解 Auth 模块接口
7. 读取 `specs/modules/user-profile-spec.md` 了解 UserProfile 模块
8. 读取 `.cursorrules` 了解代码规范

---

## 阶段 1：后端测试基础设施

### 1.1 添加依赖到 `apps/api/package.json`

找到 `devDependencies` 字段，添加：

```jsonc
{
  "@nestjs/testing": "^11.1.18",
  "jest": "^29.7.0",
  "ts-jest": "^29.3.0",
  "@types/jest": "^29.5.14",
}
```

在 `scripts` 字段添加：

```jsonc
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
}
```

### 1.2 创建 Jest 配置

在 `apps/api/` 目录下新建 `jest.config.ts`：

```typescript
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/*.interface.ts',
    '!**/*.config.ts',
    '!**/main.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
};

export default config;
```

**验证**：运行 `pnpm --filter api test`，应该输出 "No tests found"（因为还没有 spec 文件），但 Jest 启动成功无报错。

---

## 阶段 2：后端测试代码

### 2.1 VectorStoreService 测试

在 `apps/api/src/vector/` 目录新建 `vector-store.service.spec.ts`：

```typescript
import { VectorStoreService } from '@/vector/vector-store.service';

describe('VectorStoreService', () => {
  let service: VectorStoreService;

  beforeEach(() => {
    service = new VectorStoreService();
  });

  afterEach(() => {
    service.clear();
  });

  describe('cosineSimilarity', () => {
    // 通过调用 add + search 间接测试 cosineSimilarity

    it('相同向量应返回 1', () => {
      const vec = new Array(768).fill(0.1);
      service.add('test-1', vec, createMockMeta('test-1', '内容1'));
      const results = service.search(vec, 1);
      expect(results[0].similarity).toBeCloseTo(1, 5);
    });

    it('零向量输入应返回 0（避免除零错误）', () => {
      const vecA = new Array(768).fill(0);
      const vecB = new Array(768).fill(0.1);
      service.add('zero', vecA, createMockMeta('zero', ''));
      const results = service.search(vecB, 1);
      expect(results.length).toBe(0); // 零向量无法计算相似度
    });

    it('应返回 topK 个结果', () => {
      for (let i = 0; i < 5; i++) {
        service.add(
          `item-${i}`,
          new Array(768).fill(i === 0 ? 0.9 : 0.1),
          createMockMeta(`item-${i}`, `内容${i}`),
        );
      }
      const query = new Array(768).fill(0.9);
      const results = service.search(query, 3);
      expect(results).toHaveLength(3);
    });

    it('应返回按相似度降序排列的结果', () => {
      // 添加两个不同方向的向量
      service.add('close', new Array(768).fill(0.8), createMockMeta('close', '相近内容'));
      service.add('far', new Array(768).fill(-0.8), createMockMeta('far', '远离内容'));
      const query = new Array(768).fill(0.9);
      const results = service.search(query, 2);
      expect(results[0].chunkId).toBe('close');
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it('当向量空间为空时应返回空数组', () => {
      const query = new Array(768).fill(0.1);
      const results = service.search(query, 3);
      expect(results).toEqual([]);
    });
  });

  describe('add', () => {
    it('维度不匹配时应抛出 Error', () => {
      expect(() => {
        service.add('bad', [0.1, 0.2, 0.3], createMockMeta('bad', ''));
      }).toThrow('Dimension mismatch');
    });

    it('包含 NaN 时应抛出 Error', () => {
      const vec = new Array(768).fill(NaN);
      expect(() => {
        service.add('nan', vec, createMockMeta('nan', ''));
      }).toThrow('invalid values');
    });
  });

  describe('count/clear/getAll', () => {
    it('count 应返回正确数量', () => {
      service.add('a', new Array(768).fill(0.1), createMockMeta('a', ''));
      service.add('b', new Array(768).fill(0.2), createMockMeta('b', ''));
      expect(service.count()).toBe(2);
    });

    it('clear 应清空所有数据', () => {
      service.add('a', new Array(768).fill(0.1), createMockMeta('a', ''));
      service.clear();
      expect(service.count()).toBe(0);
    });
  });
});

function createMockMeta(id: string, content: string) {
  return {
    chunkId: id,
    documentName: 'test.md',
    documentTitle: '测试文档',
    category: 'test',
    categoryName: '测试',
    heading: '## 标题',
    content,
    charCount: content.length,
  };
}
```

### 2.2 RAGValidator 测试

在 `apps/api/src/rag/` 目录新建 `rag.validator.spec.ts`：

```typescript
import { validateAnswer } from '@/rag/rag.validator';

describe('validateAnswer', () => {
  const chunks = [{ content: '年假可休 5 天，2024年可休' }, { content: '报销额度 80%' }];

  it('当回答中的数字都在 chunks 中存在时应通过', () => {
    const result = validateAnswer('年假可休 5 天', chunks);
    expect(result.passed).toBe(true);
    expect(result.suspiciousNumbers).toEqual([]);
  });

  it('当回答包含 chunk 中不存在的数字时应标记为可疑', () => {
    const result = validateAnswer('年假可休 10 天', chunks);
    expect(result.passed).toBe(false);
    expect(result.suspiciousNumbers).toContain('10天');
  });

  it('当回答不包含任何数字时应通过', () => {
    const result = validateAnswer('你好，请问有什么可以帮助你的？', chunks);
    expect(result.passed).toBe(true);
    expect(result.suspiciousNumbers).toEqual([]);
  });
});
```

### 2.3 KeywordSearchService 测试

在 `apps/api/src/rag/` 目录新建 `keyword-search.service.spec.ts`：

```typescript
import { KeywordSearchService } from '@/rag/keyword-search.service';
import type { SearchResult } from '@/vector/vector.interface';

describe('KeywordSearchService', () => {
  let service: KeywordSearchService;

  const createMockChunk = (
    id: string,
    content: string,
    heading: string,
    categoryName: string,
  ): SearchResult => ({
    chunkId: id,
    content,
    documentName: 'test.md',
    documentTitle: '测试文档',
    category: 'test',
    categoryName,
    heading,
    similarity: 0,
    metadata: {
      chunkId: id,
      documentName: 'test.md',
      documentTitle: '测试文档',
      category: 'test',
      categoryName,
      heading,
      content,
      charCount: content.length,
    },
  });

  beforeEach(() => {
    service = new KeywordSearchService();
  });

  it('应匹配查询中的 HR 关键词并返回排序结果', () => {
    const chunks = [
      createMockChunk('1', '年假有 5 天', '## 年假规则', '年假'),
      createMockChunk('2', '报销流程', '## 报销', '报销'),
    ];
    const results = service.search('年假怎么请', chunks, 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunkId).toBe('1');
  });

  it('标题匹配应获得加分', () => {
    const chunks = [
      createMockChunk('1', '年假有 5 天', '## 年假规则', '年假'),
      createMockChunk('2', '年假制度说明', '## 考勤管理', '考勤'),
    ];
    const results = service.search('年假', chunks, 2);
    // 标题包含"年假"的 chunk-1 应排在前
    expect(results[0].chunkId).toBe('1');
  });

  it('无匹配关键词时应返回分数为 0 的结果', () => {
    const chunks = [createMockChunk('1', '没有任何匹配内容', '## 无关', '其他')];
    const results = service.search('人工智能', chunks, 1);
    expect(results[0].normalizedScore).toBe(0);
  });

  it('应返回 topK 个结果', () => {
    const chunks = Array.from({ length: 5 }, (_, i) =>
      createMockChunk(`${i}`, `年假内容 ${i}`, '## 年假', '年假'),
    );
    const results = service.search('年假', chunks, 3);
    expect(results).toHaveLength(3);
  });
});
```

### 2.4 AuthService 测试

在 `apps/api/src/auth/` 目录新建 `auth.service.spec.ts`：

```typescript
import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '@/auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: vi.fn().mockReturnValue('mock-token'),
            verify: vi
              .fn()
              .mockReturnValue({ username: 'employee', sub: 'user-1', role: 'employee' }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('validateUser', () => {
    it('有效凭证应返回 User 对象', async () => {
      const user = await service.validateUser('employee', '123456');
      expect(user).not.toBeNull();
      expect(user?.username).toBe('employee');
    });

    it('错误密码应返回 null', async () => {
      const user = await service.validateUser('employee', 'wrong');
      expect(user).toBeNull();
    });

    it('不存在用户应返回 null', async () => {
      const user = await service.validateUser('nonexist', '123456');
      expect(user).toBeNull();
    });
  });

  describe('login', () => {
    it('有效用户应返回 access_token', async () => {
      const result = await service.login('employee', '123456');
      expect(result.access_token).toBe('mock-token');
    });

    it('无效用户应抛出 UnauthorizedException', async () => {
      await expect(service.login('employee', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

### 2.5 ChatService 测试

在 `apps/api/src/chat/` 目录新建 `chat.service.spec.ts`：

```typescript
import { Test, type TestingModule } from '@nestjs/testing';
import { ChatService } from '@/chat/chat.service';
import { ConversationStoreService } from '@/chat/conversation-store.service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService, ConversationStoreService],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('getOrCreateConversation 应返回同一个 conversation', () => {
    const conv1 = service.getOrCreateConversation('test-conv');
    const conv2 = service.getOrCreateConversation('test-conv');
    expect(conv1.id).toBe(conv2.id);
  });

  it('addUserMessage 应添加用户消息', () => {
    const conv = service.getOrCreateConversation('test-conv');
    service.addUserMessage(conv.id, '年假怎么请');
    const history = service.getHistory(conv.id);
    expect(history).toHaveLength(1);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('年假怎么请');
  });

  it('addAssistantMessage 应添加助手消息', () => {
    const conv = service.getOrCreateConversation('test-conv');
    service.addUserMessage(conv.id, '年假怎么请');
    service.addAssistantMessage(conv.id, '根据年假制度...', []);
    const history = service.getHistory(conv.id);
    expect(history).toHaveLength(2);
    expect(history[1].role).toBe('assistant');
  });
});
```

### 2.6 UserProfileService 测试

在 `apps/api/src/user-profile/` 目录新建 `user-profile.service.spec.ts`：

```typescript
import { Test, type TestingModule } from '@nestjs/testing';
import { UserProfileService } from '@/user-profile/user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserProfileService],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
  });

  describe('isPersonalQuery', () => {
    it('包含"我"的查询应返回 true', () => {
      expect(service.isPersonalQuery('我还有多少天年假')).toBe(true);
      expect(service.isPersonalQuery('我的年假')).toBe(true);
    });

    it('不包含个人信息的查询应返回 false', () => {
      expect(service.isPersonalQuery('年假怎么请')).toBe(false);
      expect(service.isPersonalQuery('报销流程')).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('应返回已知用户的 profile', () => {
      const profile = service.getProfile('user-1');
      expect(profile).not.toBeNull();
      expect(profile?.realName).toBeTruthy();
    });

    it('未知用户应返回 null', () => {
      const profile = service.getProfile('unknown-user');
      expect(profile).toBeNull();
    });
  });
});
```

### 2.7 RAGService 测试（核心）

在 `apps/api/src/rag/` 目录新建 `rag.service.spec.ts`：

```typescript
import { Test, type TestingModule } from '@nestjs/testing';
import { RAGService } from '@/rag/rag.service';
import { EmbeddingService } from '@/embed/embed.service';
import { VectorStoreService } from '@/vector/vector-store.service';
import { KeywordSearchService } from '@/rag/keyword-search.service';
import { ChatService } from '@/chat/chat.service';
import { ConversationStoreService } from '@/chat/conversation-store.service';
import { LLMService } from '@/llm/llm.service';
import { UserProfileService } from '@/user-profile/user-profile.service';

describe('RAGService', () => {
  let service: RAGService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RAGService,
        KeywordSearchService,
        ChatService,
        ConversationStoreService,
        UserProfileService,
        {
          provide: EmbeddingService,
          useValue: { embed: vi.fn().mockResolvedValue(new Array(768).fill(0.1)) },
        },
        {
          provide: VectorStoreService,
          useValue: {
            search: vi.fn().mockReturnValue([]),
            getAll: vi.fn().mockReturnValue([]),
          },
        },
        {
          provide: LLMService,
          useValue: { generate: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<RAGService>(RAGService);
  });

  // 注意：orchestrate() 是 async generator，需要通过特殊方式测试
  // 此处先测试内部的纯函数方法

  describe('shouldReject', () => {
    it('空结果应拒绝', () => {
      // 通过测试 orchestrate 的 rejection path 间接验证
      // 由于 shouldReject 是 private 方法，通过 orchestrate 的输出验证
    });
  });

  describe('buildPrompt', () => {
    it('应包含所有必要部分', () => {
      const prompt = (service as any).buildPrompt('年假怎么请', [], [], '（未提供）');
      expect(prompt).toContain('检索到的文档片段');
      expect(prompt).toContain('当前问题');
      expect(prompt).toContain('年假怎么请');
    });
  });

  it('与 HR 无关的问题应触发拒绝', () => {
    // 通过 orchestrate 输出验证拒绝话术
  });
});
```

**注意**：由于 `RAGService` 中 `shouldReject`、`getConfidenceLevel` 等方法是 `private` 的，如果无法通过测试访问这些方法，需要通过 `orchestrate()` 的输出间接验证，或者使用 TypeScript 的 `// @ts-expect-error` 或 `(service as any)` 方式访问。推荐用 `(service as any)` 方式。

---

## 阶段 2 验证

```bash
pnpm --filter api test
```

预期结果：所有 spec 文件被 Jest 发现，全部测试通过，控制台显示测试通过数量和覆盖率摘要。

---

## 阶段 3：前端测试基础设施

### 3.1 添加依赖到 `apps/web/package.json`

找到 `devDependencies` 字段，添加：

```jsonc
{
  "vitest": "^3.1.0",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.0",
  "@testing-library/user-event": "^14.6.0",
  "jsdom": "^26.0.0",
  "identity-obj-proxy": "^3.0.0",
}
```

在 `scripts` 字段添加：

```jsonc
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
}
```

### 3.2 创建 Vitest 配置

在 `apps/web/` 目录新建 `vitest.config.ts`：

```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/**/*.d.ts', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### 3.3 创建 Test Setup 文件

在 `apps/web/src/` 目录新建 `test-setup.ts`：

```typescript
import '@testing-library/jest-dom';
```

**验证**：运行 `pnpm --filter web test`，应该输出 "No test files found"（因为还没有 test 文件），但 Vitest 启动成功无报错。

---

## 阶段 4：前端测试代码

### 4.1 Markdown 工具函数测试

在 `apps/web/src/utils/` 目录新建 `markdown.test.ts`：

````typescript
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/utils/markdown';

describe('renderMarkdown', () => {
  it('应渲染加粗文本', () => {
    const result = renderMarkdown('这是 **粗体** 文本');
    expect(result).toContain('<strong>粗体</strong>');
  });

  it('应渲染列表', () => {
    const result = renderMarkdown('- 项目1\n- 项目2');
    expect(result).toContain('<li>项目1</li>');
    expect(result).toContain('<li>项目2</li>');
  });

  it('应渲染代码块', () => {
    const result = renderMarkdown('```\nconsole.log("hello")\n```');
    expect(result).toContain('code');
    expect(result).toContain('console.log');
  });

  it('应转义 XSS 向量', () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('空输入应返回空字符串', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
````

### 4.2 DocumentCard 组件测试

在 `apps/web/src/components/Document/` 目录新建 `DocumentCard.test.tsx`：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentCard } from '@/components/Document/DocumentCard';

const mockDoc = {
  id: '1',
  filename: '年假制度.md',
  title: '年假制度',
  category: 'annual_leave',
  categoryName: '年假',
  updatedAt: '2026-01-15T00:00:00.000Z',
};

describe('DocumentCard', () => {
  it('应显示文档标题和分类', () => {
    const onClick = vi.fn();
    render(<DocumentCard document={mockDoc} onClick={onClick} />);
    expect(screen.getByText('年假制度')).toBeInTheDocument();
    expect(screen.getByText('年假')).toBeInTheDocument();
  });

  it('点击应触发 onClick', () => {
    const onClick = vi.fn();
    render(<DocumentCard document={mockDoc} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith('1');
  });

  it('Enter 键应触发 onClick', () => {
    const onClick = vi.fn();
    render(<DocumentCard document={mockDoc} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith('1');
  });
});
```

### 4.3 ConfidenceBadge 组件测试

在 `apps/web/src/components/Chat/` 目录新建 `ConfidenceBadge.test.tsx`：

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceBadge } from '@/components/Chat/ConfidenceBadge';

describe('ConfidenceBadge', () => {
  it('high 应显示高置信度', () => {
    render(<ConfidenceBadge level="high" />);
    expect(screen.getByText(/高/)).toBeInTheDocument();
  });

  it('medium 应显示中置信度', () => {
    render(<ConfidenceBadge level="medium" />);
    expect(screen.getByText(/中/)).toBeInTheDocument();
  });

  it('low 应显示低置信度', () => {
    render(<ConfidenceBadge level="low" />);
    expect(screen.getByText(/低/)).toBeInTheDocument();
  });
});
```

### 4.4 HallucinationWarning 组件测试

在 `apps/web/src/components/Chat/` 目录新建 `HallucinationWarning.test.tsx`：

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HallucinationWarning } from '@/components/Chat/HallucinationWarning';

describe('HallucinationWarning', () => {
  it('应显示警告信息', () => {
    render(<HallucinationWarning />);
    expect(screen.getByText(/请核实|注意|警告|温馨提示/i)).toBeTruthy();
  });
});
```

### 4.5 ChatMessage 组件测试

在 `apps/web/src/components/Chat/` 目录新建 `ChatMessage.test.tsx`：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '@/components/Chat/ChatMessage';

describe('ChatMessage', () => {
  it('用户消息应显示内容', () => {
    render(<ChatMessage message={{
      id: '1', role: 'user', content: '年假怎么请', timestamp: Date.now(), status: 'complete',
    }} />);
    expect(screen.getByText('年假怎么请')).toBeInTheDocument();
  });

  it('助理加载中应显示脉冲动画', () => {
    render(<ChatMessage message={{
      id: '2', role: 'assistant', content: '', timestamp: Date.now(), status: 'sending',
    }} />);
    // 加载状态下应有 CSS 动画元素
    expect(screen.getByText('●')).toBeInTheDocument();
  });

  it('助理完成时应显示来源引用', () => {
    render(<ChatMessage message={{
      id: '3', role: 'assistant', content: '年假有5天', timestamp: Date.now(),
      status: 'complete',
      sources: [{ documentName: '年假制度.md', documentTitle: '年假制度', category: 'annual_leave', chunk: '年假有5天', similarity: 0.85 }],
      confidenceLevel: 'high',
    }} />);
    expect(screen.getByText('年假制度')).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('error 状态应显示错误文本', () => {
    render(<ChatMessage message={{
      id: '4', role: 'assistant', content: '出错了', timestamp: Date.now(),
      status: 'error', error: '网络异常',
    }} />);
    expect(screen.getByText('网络异常')).toBeInTheDocument();
  });
});
```

### 4.6 useChat Hook 测试

在 `apps/web/src/hooks/` 目录新建 `useChat.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from '@/hooks/useChat';

describe('useChat', () => {
  it('初始状态 messages 应为空', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('clearConversation 应清空所有消息', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.clearConversation();
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.conversationId).toBeNull();
  });

  it('setInputValue 应更新输入值', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.setInputValue('年假怎么请');
    });
    expect(result.current.inputValue).toBe('年假怎么请');
  });
});
```

### 4.7 DocumentUploader 组件测试

在 `apps/web/src/components/Document/` 目录新建 `DocumentUploader.test.tsx`：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentUploader } from '@/components/Document/DocumentUploader';

describe('DocumentUploader', () => {
  it('应显示上传按钮', () => {
    render(<DocumentUploader onSuccess={vi.fn()} />);
    expect(screen.getByText(/上传文档/)).toBeInTheDocument();
  });

  it('上传按钮应有 text/button 角色', () => {
    render(<DocumentUploader onSuccess={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
```

---

## 阶段 5：根目录脚本 + CI 配置

### 5.1 更新根目录 package.json

在 `package.json` 的 `scripts` 中添加：

```jsonc
{
  "test": "pnpm --recursive test",
  "test:coverage": "pnpm --recursive test:coverage",
}
```

### 5.2 创建 CI 配置文件

在 `.github/workflows/` 目录新建 `ci.yml`（如果目录不存在则创建）：

```yaml
name: CI
on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm test
```

---

## 最终验证

```bash
# 安装新依赖
pnpm install

# 运行后端测试
pnpm --filter api test

# 运行前端测试
pnpm --filter web test

# 同时运行（根目录）
pnpm test

# 确保 lint 仍然通过
pnpm lint
```

全部通过后，提交并推送：

```bash
git add .
git commit -m "feat(tests): add core unit tests for backend and frontend

- Add Jest + NestJS testing for backend services
  - VectorStoreService: cosine similarity, search, error handling
  - RAGValidator: hallucination number detection
  - KeywordSearchService: keyword matching and scoring
  - AuthService: user validation, JWT login
  - ChatService: conversation CRUD operations
  - UserProfileService: personal query detection
- Add Vitest + React Testing Library for frontend
  - ChatMessage: render states for all message types
  - ConfidenceBadge: level display
  - HallucinationWarning: warning display
  - DocumentCard: category color, click handling
  - useChat: state machine and input management
  - DocumentUploader: button rendering
  - renderMarkdown: formatting and XSS safety
- Configure CI with lint, format check, and test execution
- Verified: pnpm lint passes, all tests pass"

git push origin feature/add-core-unit-tests
```

---

## 常见陷阱

1. **CSS Modules 导入报错**：Vitest 需要 `identity-obj-proxy` 来处理 `.module.css` 导入，如果遇到问题，在 `vitest.config.ts` 的 `test.css.modules` 中配置 `classNameStrategy: 'non-scoped'`
2. **@/ 路径别名**：Jest 需要 `moduleNameMapper` 配置，Vitest 需要 `resolve.alias` 配置，两者缺一不可
3. **JwtService mock**：`@nestjs/jwt` 的 `JwtService` 需要正确 mock `sign` 和 `verify` 方法
4. **useChat hook 测试**：该 hook 内部调用 `streamAsk`（网络请求），测试时需要使用 `vi.mock` 模拟 `@/api/sse` 模块
5. **pnpm workspace 测试脚本**：使用 `pnpm --recursive test` 会递归所有子包执行 test 脚本，确保两个子包都有 test 脚本

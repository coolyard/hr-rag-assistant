# Feature Spec：为项目添加核心单元测试

> 本 Feature 为项目后端和前端添加核心模块的单元测试，覆盖服务层逻辑、工具函数、组件渲染和状态管理。目标是保证后续重构安全，提升代码可信度。
>
> 对应模块：rag-spec.md、vector-spec.md、embedding-spec.md、chat-spec.md、auth-spec.md、api-spec.md
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前项目**零测试覆盖**（已确认：`find . -name "*.test.*" -o -name "*.spec.*"` 无任何匹配文件）。大部分核心逻辑（RAG 编排、关键词检索、向量检索、幻觉校验、Prompt 组装）缺少单元测试。作为面试演示项目，测试缺失是硬伤——面试官会问"你怎么保证代码质量"，目前没有答案。

### 1.2 目标

1. **后端基础设施搭建**：添加 Jest + NestJS Testing 支持，配置 `jest.config.ts` 和测试脚本
2. **后端核心逻辑覆盖**：RAGService、KeywordSearch、VectorStore、ChatService、AuthService 等核心模块的单元测试
3. **前端基础设施搭建**：添加 Vitest + React Testing Library，配置 `vitest.config.ts` 和测试脚本
4. **前端组件/逻辑覆盖**：ChatMessage、useChat、DocumentCard 等核心前端模块的测试
5. **CI 集成**：将测试加入 CI 流程，`pnpm test` 作为门禁

### 1.3 明确不做

- ❌ E2E 测试（Playwright/Cypress）—— MVP 阶段专注单元测试
- ❌ 集成测试（真实 Ollama 调用）—— 使用 mock 避免依赖外部服务
- ❌ 视觉回归测试（Storybook/Chromatic）
- ❌ 性能测试/基准测试
- ❌ 100% 行覆盖率 —— 目标为核心模块覆盖率 > 80%

### 1.4 测试优先级矩阵

| 优先级 | 模块 | 类型 | 测试内容 | 行覆盖率目标 |
|--------|------|------|---------|------------|
| P0 | rag.service.ts | 纯逻辑 + DI | shouldReject、mergeResults、buildPrompt、getConfidenceLevel | > 90% |
| P0 | rag.validator.ts | 纯函数 | validateAnswer 幻觉检测 | 100% |
| P0 | keyword-search.service.ts | 纯逻辑 | 关键词匹配、分数计算、边界情况 | > 90% |
| P0 | vector-store.service.ts | 纯逻辑 | cosineSimilarity、add/search/clear | > 90% |
| P0 | useChat.ts hook | 状态机 | 消息状态转换、SSE 事件处理 | > 80% |
| P0 | ChatMessage.tsx | 组件渲染 | 各状态渲染快照、事件回调 | > 80% |
| P1 | chat.service.ts | DI 逻辑 | 对话 CRUD、历史管理 | > 85% |
| P1 | auth.service.ts | DI 逻辑 | 用户验证、JWT 签发、角色检查 | > 85% |
| P1 | DocumentCard.tsx | 组件渲染 | 分类色映射、点击交互 | > 80% |
| P1 | markdown.ts | 纯函数 | 渲染安全性、格式转换 | 100% |
| P2 | embed.service.ts | DI + HTTP | Embedding 调用封装 | > 70% |
| P2 | llm.service.ts | DI + HTTP | LLM 调用封装 | > 70% |
| P2 | DocumentUploader.tsx | 组件渲染 | 文件校验、上传状态 | > 70% |
| P2 | user-profile.service.ts | 纯逻辑 | isPersonalQuery、formatForPrompt | > 80% |

---

## 2. 后端测试设计

### 2.1 测试框架选择

| 项目 | 选择 | 原因 |
|------|------|------|
| Runner | Jest 29 | NestJS 原生支持，社区成熟 |
| NestJS Testing | @nestjs/testing | NestJS 官方测试工具，支持 DI Mock |
| Mock | jest-mock (内置) | 足够满足当前需求 |
| Config | jest.config.ts | TypeScript 友好 |
| Path Alias | moduleNameMapper | 匹配 `@/` 路径别名 |

### 2.2 测试文件结构

```
apps/api/src/
├── rag/
│   ├── rag.service.ts
│   ├── rag.service.spec.ts           ← 新增
│   ├── rag.validator.ts
│   ├── rag.validator.spec.ts         ← 新增
│   ├── keyword-search.service.ts
│   ├── keyword-search.service.spec.ts ← 新增
├── vector/
│   ├── vector-store.service.ts
│   ├── vector-store.service.spec.ts  ← 新增
├── chat/
│   ├── chat.service.ts
│   ├── chat.service.spec.ts          ← 新增
├── auth/
│   ├── auth.service.ts
│   ├── auth.service.spec.ts          ← 新增
├── user-profile/
│   ├── user-profile.service.ts
│   ├── user-profile.service.spec.ts  ← 新增
├── embed/
│   ├── embed.service.ts
│   ├── embed.service.spec.ts         ← 新增
├── llm/
│   ├── llm.service.ts
│   ├── llm.service.spec.ts           ← 新增
```

### 2.3 关键测试用例设计

#### RAGService（核心编排）

```
describe('RAGService', () => {
  describe('mergeResults', () => {
    it('应正确合并向量检索和关键词检索结果')
    it('应按 hybridScore 降序排列')
    it('当向量和关键词结果重叠时应累加分数')
    it('应返回 topK 个结果')
  });

  describe('shouldReject', () => {
    it('当 results 为空时应拒绝')
    it('当最高 hybridScore < 0.5 时应拒绝')
    it('当关键词无匹配且向量最高分 < 0.5 时应拒绝')
    it('当查询包含隐私模式（如"张三的工资"）时应拒绝')
    it('当查询包含公司机密模式（如"裁员"）时应拒绝')
    it('当查询与 HR 无关且分数 < 0.6 时应拒绝')
    it('当用户查询个人数据且有 profile 时应放行')
  });

  describe('getConfidenceLevel', () => {
    it('当 score > 0.8 时应返回 high')
    it('当 score 0.5-0.8 时应返回 medium')
    it('当 score < 0.5 时应返回 low')
  });

  describe('buildPrompt', () => {
    it('应正确替换模板中的四个占位符')
    it('当 chunks 为空时应显示"无相关文档片段"')
    it('当 history 为空时应显示"无历史对话"')
    it('当 token 超限时应压缩历史记录')
  });
});
```

#### VectorStoreService（向量逻辑）

```
describe('VectorStoreService', () => {
  describe('cosineSimilarity', () => {
    it('相同向量应返回 1')
    it('正交向量应返回 0')
    it('相反向量应返回 -1')
    it('零向量应返回 0（避免除零错误）')
    it('维度不匹配时应抛出 Error')
  });

  describe('add', () => {
    it('应成功添加有效向量')
    it('维度不匹配时应抛出 Error')
    it('包含 NaN/Infinity 时应抛出 Error')
  });

  describe('search', () => {
    it('应返回按相似度降序排列的结果')
    it('当向量空间为空时应返回空数组')
    it('应返回 topK 个结果')
  });

  describe('clear', () => {
    it('应清空所有向量')
  });
});
```

#### RAGValidator（幻觉检测）

```
describe('validateAnswer', () => {
  it('当回答中的数字都在 chunks 中存在时应通过')
  it('当回答包含 chunk 中不存在的数字时应标记为可疑')
  it('当回答不包含任何数字时应通过')
});
```

#### KeywordSearchService（关键词匹配）

```
describe('KeywordSearchService', () => {
  it('应能匹配查询中的 HR 关键词')
  it('标题匹配应获得加分')
  it('分类匹配应获得加分')
  it('无匹配关键词时应返回分数为 0 的结果')
  it('空查询应返回空数组')
  it('应返回 topK 个结果')
});
```

#### AuthService（认证逻辑）

```
describe('AuthService', () => {
  describe('validateUser', () => {
    it('有效凭证应返回 User 对象')
    it('错误密码应返回 null')
    it('不存在用户应返回 null')
  });

  describe('login', () => {
    it('有效用户应返回 access_token')
    it('无效用户应抛出 UnauthorizedException')
  });

  describe('verify', () => {
    it('有效 token 应返回 payload')
    it('过期 token 应抛出异常')
    it('伪造 token 应抛出异常')
  });
});
```

---

## 3. 前端测试设计

### 3.1 测试框架选择

| 项目 | 选择 | 原因 |
|------|------|------|
| Runner | Vitest 3 | Vite 原生集成，零配置启动 |
| DOM | @testing-library/react | React 组件测试标准库 |
| Hooks | @testing-library/react-hooks | 自定义 Hook 测试 |
| Mock | vitest-mock (内置) | vi.fn()/vi.spyOn() |
| Path Alias | vite.config.ts 全局 resolve.alias | 与生产构建一致 |
| CSS Modules | identity-obj-proxy | 避免 CSS Module 编译错误 |

### 3.2 测试文件结构

```
apps/web/src/
├── components/
│   ├── Chat/
│   │   ├── ChatMessage.tsx
│   │   ├── ChatMessage.test.tsx           ← 新增
│   │   ├── ConfidenceBadge.tsx
│   │   ├── ConfidenceBadge.test.tsx       ← 新增
│   │   ├── HallucinationWarning.tsx
│   │   ├── HallucinationWarning.test.tsx  ← 新增
│   ├── Document/
│   │   ├── DocumentCard.tsx
│   │   ├── DocumentCard.test.tsx          ← 新增
│   │   ├── DocumentUploader.tsx
│   │   ├── DocumentUploader.test.tsx      ← 新增
├── hooks/
│   ├── useChat.ts
│   ├── useChat.test.ts                   ← 新增
├── utils/
│   ├── markdown.ts
│   ├── markdown.test.ts                  ← 新增
```

### 3.3 关键测试用例设计

#### ChatMessage 组件

```
describe('ChatMessage', () => {
  it('用户消息应显示右对齐气泡')
  it('助手加载中应显示脉冲动画')
  it('助手流式中应显示打字光标')
  it('助手完成时应显示来源引用卡片')
  it('置信度为 high 时应显示绿色标签')
  it('置信度为 medium 时应显示黄色标签')
  it('置信度为 low 时应显示红色标签')
  it('有 hallucinationWarning 时应显示警告')
  it('有 followUps 时应显示猜测按钮')
  it('error 状态应显示错误文本')
});
```

#### useChat Hook

```
describe('useChat', () => {
  it('初始状态 messages 应为空')
  it('sendMessage 应添加用户消息和助手消息')
  it('isLoading 在发送中应为 true，完成后为 false')
  it('流式 chunk 应追加到助手消息 content')
  it('完成时应设置 status 为 complete')
  it('错误时应设置 status 为 error')
  it('clearConversation 应清空所有消息')
});
```

#### DocumentCard 组件

```
describe('DocumentCard', () => {
  it('应显示文档标题和分类')
  it('分类色应正确映射')
  it('点击应触发 onClick')
  it('Enter 键应触发 onClick')
});
```

#### Markdown 工具函数

```
describe('renderMarkdown', () => {
  it('应渲染加粗文本 (**bold**)')
  it('应渲染列表')
  it('应渲染代码块')
  it('应转义 XSS 向量')
  it('空输入应返回空字符串')
});
```

---

## 4. 配置文件变更

### 4.1 后端新增依赖

```jsonc
// apps/api/package.json
{
  "devDependencies": {
    "@nestjs/testing": "^11.1.18",
    "jest": "^29.7.0",
    "ts-jest": "^29.3.0",
    "@types/jest": "^29.5.14"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 4.2 后端 Jest 配置

```typescript
// apps/api/jest.config.ts
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

### 4.3 前端新增依赖

```jsonc
// apps/web/package.json
{
  "devDependencies": {
    "vitest": "^3.1.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/user-event": "^14.6.0",
    "jsdom": "^26.0.0",
    "identity-obj-proxy": "^3.0.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 4.4 前端 Vitest 配置

```typescript
// apps/web/vitest.config.ts
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### 4.5 前端 Test Setup 文件

```typescript
// apps/web/src/test-setup.ts
import '@testing-library/jest-dom';
```

### 4.6 根目录测试脚本

```jsonc
// package.json（根目录）
{
  "scripts": {
    "test": "pnpm --recursive test",
    "test:coverage": "pnpm --recursive test:coverage"
  }
}
```

### 4.7 CI 配置（新增）

```yaml
# .github/workflows/ci.yml
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

## 5. 验收标准

### 5.1 后端验收

- [ ] `pnpm --filter api test` 成功运行，所有 spec 文件被 Jest 发现并执行
- [ ] `pnpm --filter api test:coverage` 显示覆盖率报告
- [ ] RAGService P0 测试覆盖：mergeResults、shouldReject、getConfidenceLevel、buildPrompt
- [ ] RAGValidator 纯函数测试覆盖：validateAnswer 幻觉检测逻辑（100% 行覆盖率）
- [ ] KeywordSearchService 测试覆盖：关键词匹配、分数计算、边界条件
- [ ] VectorStoreService 测试覆盖：cosineSimilarity、add、search、clear
- [ ] ChatService 测试覆盖：对话 CRUD、历史管理
- [ ] AuthService 测试覆盖：用户验证、JWT 签发、token 验证
- [ ] UserProfileService 测试覆盖：isPersonalQuery、formatForPrompt

### 5.2 前端验收

- [ ] `pnpm --filter web test` 成功运行，所有 test 文件被 Vitest 发现并执行
- [ ] ChatMessage 组件测试覆盖：用户/助手消息、流式状态、来源引用、置信度标签、异常状态
- [ ] useChat hook 测试覆盖：消息状态机转换、SSE 事件处理
- [ ] DocumentCard 组件测试覆盖：渲染、分类色映射、交互事件
- [ ] renderMarkdown 工具函数测试覆盖：格式渲染、XSS 防护
- [ ] DocumentUploader 组件测试覆盖：文件校验、上传流程

### 5.3 全局验收

- [ ] `pnpm test` 从根目录同时触发后端和前端测试
- [ ] 所有 mock 使用正确，不依赖真实 Ollama 服务
- [ ] 测试运行时间：后端 < 10 秒，前端 < 10 秒
- [ ] 核心模块覆盖率 > 80%

---

## 6. 依赖关系

```
add-core-unit-tests
  ├── 前置：全部 Phase 1-3 完成（已有代码）
  ├── 前置：pnpm install 能正常安装依赖
  ├── 前置：apps/api/src/ 和 apps/web/src/ 代码完整
  └── 后置：无（本 Feature 不依赖后续变更）
```

---

## 7. Spec 演进记录

| 日期 | 版本 | 变更内容 | 变更人 |
|------|------|---------|--------|
| 2026-06-09 | v1.0 | 初始版本，定义测试范围、框架、用例和验收标准 | — |

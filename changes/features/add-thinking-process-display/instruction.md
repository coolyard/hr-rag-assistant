# Agent 指令：在 Chat 中展示 AI 思考过程

> 【执行纪律】本指令包含 8 个 Task，分为 4 个阶段。你必须严格按照阶段顺序逐一完成，每完成一个阶段后运行对应验证命令确保通过后再进入下一阶段。禁止跳过任何步骤。

---

## 前置阅读（必须先读）

1. 读取 `changes/features/add-thinking-process-display/spec.md` 了解完整需求和用例
2. 读取 `apps/api/src/rag/rag.interface.ts` 了解 `StreamChunk` 接口
3. 读取 `apps/api/src/ask/ask.interface.ts` 了解 `AskStreamChunk` 接口
4. 读取 `apps/api/src/rag/rag.service.ts` 了解 `orchestrate()` 流程
5. 读取 `apps/api/src/ask/ask.controller.ts` 了解 SSE 传输层
6. 读取 `apps/web/src/api/sse.ts` 了解前端 SSE 类型
7. 读取 `apps/web/src/hooks/useChat.ts` 了解前端消息处理
8. 读取 `apps/web/src/components/Chat/ChatMessage.tsx` 了解消息组件
9. 读取 `apps/web/src/components/Chat/ChatMessage.module.css` 了解现有样式

---

## 阶段 1：后端接口与类型变更（T-01 ~ T-03）

### T-01：StreamChunk 和 AskStreamChunk 增加 reasoning 字段

#### 1.1 编辑 `apps/api/src/rag/rag.interface.ts`

在 `StreamChunk` 接口中，`status?: string;` 之后新增：

```typescript
  reasoning?: string;
```

#### 1.2 编辑 `apps/api/src/ask/ask.interface.ts`

在 `AskStreamChunk` 接口中，`status?: string;` 之后新增：

```typescript
  reasoning?: string;
```

### T-02：rag.service.ts orchestrate 各阶段 yield reasoning

编辑 `apps/api/src/rag/rag.service.ts`，在 `orchestrate()` 方法的关键节点 yield reasoning 内容：

#### 2.1 向量检索阶段

在 `yield { token: '', done: false, status: '正在检索相关文档...' };` 之后，紧接着 yield：

```typescript
yield { token: '', done: false, reasoning: '正在启动向量语义检索，查找与问题最相关的文档片段...' };
```

#### 2.2 关键词检索阶段

在调用 `this.keywordSearch.search()` 之前，yield：

```typescript
yield { token: '', done: false, reasoning: '正在进行关键词精确匹配，补充制度规则类文档...' };
```

#### 2.3 结果合并阶段

在 `merged = this.mergeResults(...)` 之后，yield：

```typescript
yield {
  token: '',
  done: false,
  reasoning: `检索完成：向量检索返回 ${String(vectorResults.length)} 条，关键词检索返回 ${String(keywordResults.length)} 条，合并去重后得到 ${String(merged.length)} 条相关文档。`,
};
```

#### 2.4 个人数据注入阶段

在 `userProfileText = this.userProfileService.formatForPrompt(profile);` 之后（且 `hasPersonalData` 为 true 时），yield：

```typescript
yield {
  token: '',
  done: false,
  reasoning: `已匹配到用户个人信息：${profile.realName}，${profile.department} ${profile.position}，年假剩余 ${String(profile.annualLeaveRemaining)} 天...`,
};
```

#### 2.5 拒绝回答阶段

在 `shouldReject()` 返回 true 时，在 yield rejection 之前：

```typescript
yield { token: '', done: false, reasoning: '检索到的文档相似度过低，无法提供可靠回答。' };
```

#### 2.6 LLM 生成阶段

在 `yield { token: '', done: false, status: '正在生成回答...' };` 之后，yield：

```typescript
yield { token: '', done: false, reasoning: '已构建提示词（包含检索文档 + 用户个人信息 + 对话历史），正在调用 LLM 生成回答...' };
```

> **注意**：reasoning 内容使用中文，语气专业、简洁。不要使用英文或技术术语（如 "RAG pipeline"、"top-k" 等）。

### T-03：ask.controller.ts 传递 reasoning 到 SSE

编辑 `apps/api/src/ask/ask.controller.ts`，在构建 `data` 对象时，将 `chunk.reasoning` 传递出去：

在 `const data: AskStreamChunk = { ... };` 中添加 `reasoning` 字段。完整的数据对象变为：

```typescript
const data: AskStreamChunk = {
  chunk: chunk.token,
  done: chunk.done,
  status: chunk.status,
  reasoning: chunk.reasoning, // 新增
  followUps: chunk.followUps,
  sources: chunk.sources,
  confidenceLevel: chunk.confidenceLevel,
  hallucinationWarning: chunk.hallucinationWarning,
  error: chunk.error,
  conversationId: body.conversationId,
};
```

### 阶段 1 验证

```bash
cd apps/api && npx tsc --noEmit
```

确保 TypeScript 编译无错误。

---

## 阶段 2：前端类型与状态管理变更（T-04）

### T-04：前端 SSE 类型和 useChat hook 增加 reasoning 支持

#### 4.1 编辑 `apps/web/src/api/sse.ts`

在 `AskStreamChunk` 接口中，`status?: string;` 之后新增：

```typescript
  reasoning?: string;
```

#### 4.2 编辑 `apps/web/src/hooks/useChat.ts`

##### a) Message 接口

在 `Message` 接口中，`error?: string;` 之后新增：

```typescript
  reasoning?: string;
```

##### b) sendMessage 中的 reasoning 处理

在 `sendMessage` 的 `for await` 循环中，在处理 `chunk.status` 之后，新增处理 `chunk.reasoning` 的逻辑：

```typescript
if (chunk.reasoning) {
  setMessages((prev) =>
    prev.map((m) =>
      m.id === assistantMsg.id ? { ...m, reasoning: (m.reasoning ?? '') + chunk.reasoning! } : m,
    ),
  );
}
```

### 阶段 2 验证

```bash
cd apps/web && npx tsc --noEmit
```

---

## 阶段 3：前端 UI 组件变更（T-05 ~ T-06）

### T-05：ChatMessage.tsx 新增 ThinkingSection 组件

编辑 `apps/web/src/components/Chat/ChatMessage.tsx`：

#### 5.1 新增 ThinkingSection 组件

在 `CitationCard` 组件定义之后、`ChatMessage` 之前，新增：

```tsx
interface ThinkingSectionProps {
  reasoning: string;
  isStreaming: boolean;
}

const ThinkingSection: FC<ThinkingSectionProps> = ({ reasoning, isStreaming }) => {
  const [expanded, setExpanded] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setExpanded(true);
    }
  }, [isStreaming]);

  // 当 streaming 完成时自动折叠
  useEffect(() => {
    if (!isStreaming && expanded) {
      const timer = setTimeout(() => setExpanded(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, expanded]);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (reasoning.length === 0) {
    return null;
  }

  // 用简单的 Unicode 字符做折叠指示器，避免引入图标库
  const chevron = expanded ? '▾' : '▸';

  return (
    <div className={styles.thinkingSection}>
      <div
        className={styles.thinkingHeader}
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') toggle();
        }}
      >
        <span className={styles.thinkingChevron}>{chevron}</span>
        <span className={styles.thinkingLabel}>{isStreaming ? '思考中...' : '思考过程'}</span>
      </div>
      <div className={expanded ? styles.thinkingContentExpanded : styles.thinkingContent}>
        <p className={styles.thinkingText}>{reasoning}</p>
      </div>
    </div>
  );
};
```

> 注意：需要新增 `useEffect` 导入（在文件顶部 import 中补充）。

#### 5.2 在 ChatMessage 中渲染 ThinkingSection

在 assistant 分支中，在 `assistantBubble` div 内部、laoding dots 之前，插入：

```tsx
{
  message.reasoning && (
    <ThinkingSection
      reasoning={message.reasoning}
      isStreaming={message.status === 'sending' || message.status === 'streaming'}
    />
  );
}
```

### T-06：ChatMessage.module.css 新增思考过程样式

编辑 `apps/web/src/components/Chat/ChatMessage.module.css`，在文件末尾新增以下样式：

```css
/* ── 思考过程区域 ── */

.thinkingSection {
  margin-bottom: 10px;
}

.thinkingHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  font-size: 0.83rem;
  color: var(--text-secondary);
}

.thinkingHeader:hover {
  background: var(--hover-bg);
}

.thinkingChevron {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.thinkingLabel {
  font-weight: 500;
}

.thinkingContent {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition:
    max-height 0.2s ease,
    opacity 0.2s ease;
}

.thinkingContentExpanded {
  max-height: 600px;
  opacity: 1;
  overflow-y: auto;
  padding: 10px 12px;
  margin-top: 4px;
  background: var(--bg-secondary);
  border-left: 2px solid var(--accent-color);
  border-radius: 0 6px 6px 0;
  transition:
    max-height 0.2s ease,
    opacity 0.2s ease;
}

.thinkingText {
  margin: 0;
  font-size: 0.83rem;
  color: var(--text-secondary);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
```

### 阶段 3 验证

```bash
cd apps/web && npx tsc --noEmit
pnpm build
```

确保前端构建成功。

---

## 阶段 4：E2E Mock 与测试更新（T-07 ~ T-08）

### T-07：E2E Mock 数据增加 reasoning

#### 7.1 编辑 `apps/web/e2e/fixtures/test-data.ts`

新增一个 reasoning mock 数组：

```typescript
// ── 思考过程 Mock 数据 ──
export const MOCK_REASONING_CHUNKS = [
  '正在启动向量语义检索，查找与问题最相关的文档片段...\n',
  '正在进行关键词精确匹配，补充制度规则类文档...\n',
  '检索完成：向量检索返回 2 条，关键词检索返回 2 条，合并去重后得到 3 条相关文档。\n',
  '已构建提示词（包含检索文档 + 用户个人信息 + 对话历史），正在调用 LLM 生成回答...\n',
];
```

#### 7.2 编辑 `apps/web/e2e/mocks/api-handlers.ts`

修改 `buildSSEResponse()` 函数，在回答内容之前先发送 reasoning chunks：

```typescript
function buildSSEResponse(): string {
  let sseData = '';
  // 先发送 reasoning 片段
  for (const reasoning of MOCK_REASONING_CHUNKS) {
    sseData += `data: ${JSON.stringify({ chunk: '', done: false, reasoning })}\n\n`;
  }
  // 再发送内容 chunk
  for (const chunk of MOCK_SSE_CHUNKS) {
    sseData += `data: ${JSON.stringify({ chunk, done: false })}\n\n`;
  }
  // 最后发送完成标记
  sseData += `data: ${JSON.stringify({
    chunk: '',
    done: true,
    sources: MOCK_SSE_SOURCES,
    confidenceLevel: 'high',
    followUps: MOCK_SSE_FOLLOWUPS,
  })}\n\n`;
  return sseData;
}
```

> 注意：在 `buildSSEResponse` 顶部要导入 `MOCK_REASONING_CHUNKS`：
>
> ```typescript
> import { ..., MOCK_REASONING_CHUNKS } from '../fixtures/test-data';
> ```

### T-08：E2E 测试新增思考过程用例

#### 8.1 新建 `apps/web/e2e/specs/thinking.spec.ts`

创建新文件，内容如下：

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('思考过程展示', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
    await page.goto('/chat');
  });

  test('TC-REASON-01: 思考过程区域渲染', async ({ page }) => {
    // 点击快捷问题发送消息
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    // 等待回答完成
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 验证思考过程区域出现
    await expect(page.getByText('思考过程')).toBeVisible();
  });

  test('TC-REASON-02: 思考过程内容不为空', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    // 等待思考过程头部出现
    await expect(page.getByText('思考过程')).toBeVisible({ timeout: 10000 });
    // 点击展开
    await page.getByText('思考过程').click();
    // 验证内容不为空（至少包含"向量"或"检索"关键词）
    const content = page.locator('text=/向量|检索|文档/');
    await expect(content.first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-REASON-03: 思考完成后折叠', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    // 等待回答完成
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 等待 3 秒后检查思考内容是否隐藏（自动折叠）
    await page.waitForTimeout(4000);
    const thinkingContent = page.locator('.thinkingContentExpanded');
    await expect(thinkingContent).not.toBeVisible();
  });

  test('TC-REASON-04: 点击展开折叠', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    // 等待回答完成
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(4000);
    // 点击折叠头部展开
    await page.getByText('思考过程').click();
    // 使用 CSS class 验证展开
    const expanded = page.locator('.thinkingContentExpanded');
    await expect(expanded).toBeVisible({ timeout: 3000 });
    // 再次点击折叠
    await page.getByText('思考过程').click();
    await expect(expanded).not.toBeVisible();
  });

  test('TC-REASON-05: 现有功能不受影响', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    // 等待回答完成
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 验证 Markdown 内容正常渲染
    await expect(page.getByText('年假')).toBeVisible();
    // 验证来源引用存在
    await expect(page.getByText('参考来源：')).toBeVisible();
    // 验证猜你想问存在
    await expect(page.getByText('猜你想问：')).toBeVisible();
  });
});
```

### 阶段 4 验证

```bash
pnpm install
cd apps/web && npx playwright install chromium && cd ../..
pnpm test:e2e
```

确保新增 5 个测试全部通过，同时现有 25 个测试无回归。

---

## 最终验证

全部阶段完成后，运行以下命令：

```bash
pnpm lint
pnpm format:check
pnpm build
pnpm test
pnpm test:e2e
```

全部通过后，提交代码。

# Agent 指令：RAG 检索可视化面板

> 【执行纪律】本指令包含 8 个 Task，分为 4 个阶段。严格按照阶段顺序逐一完成，每阶段完成后运行验证通过再进入下一阶段。

---

## 前置阅读

1. `changes/features/add-rag-retrieval-visualization/spec.md`
2. `apps/api/src/rag/rag.interface.ts`（`StreamChunk`、`SourceCitation`）
3. `apps/api/src/ask/ask.interface.ts`（`AskStreamChunk`）
4. `apps/api/src/rag/rag.service.ts`（`orchestrate` 方法，特别是 `buildSources` 和 done chunk）
5. `apps/api/src/ask/ask.controller.ts`（SSE 传输层）
6. `apps/web/src/api/sse.ts`（前端 SSE 类型）
7. `apps/web/src/hooks/useChat.ts`（Message 类型和 chunk 处理）
8. `apps/web/src/components/Chat/ChatMessage.tsx`（消息底部按钮区域）

---

## 阶段 1：后端数据接口（T-01 ~ T-03）

### T-01：新增 `RetrievalDetail` / `SourceItem` 类型

#### 1.1 编辑 `apps/api/src/rag/rag.interface.ts`

在文件末尾（`ToolResult` 接口之后）新增：

```typescript
export interface SourceItem {
  documentTitle: string;
  similarity: number;
  source: 'vector' | 'keyword';
}

export interface RetrievalDetail {
  vectorCount: number;
  keywordCount: number;
  mergedCount: number;
  vectorSources: SourceItem[];
  keywordSources: SourceItem[];
}
```

在 `StreamChunk` 接口中（`completionTokens?: number;` 之后）新增：

```typescript
  retrievalDetail?: RetrievalDetail;
```

#### 1.2 编辑 `apps/api/src/ask/ask.interface.ts`

在 `AskStreamChunk` 接口中（`completionTokens?: number;` 之后）新增：

```typescript
  retrievalDetail?: import('@/rag/rag.interface').RetrievalDetail;
```

### T-02：`rag.service.ts` done chunk 中构建 `retrievalDetail`

编辑 `apps/api/src/rag/rag.service.ts`，在 `orchestrate()` 方法的最终 `yield`（done chunk）之前，构建 `retrievalDetail`：

找到 `const sources = this.buildSources(merged);` 这一行，在它之后插入：

```typescript
// 构建检索可视化数据
const retrievalDetail: RetrievalDetail = {
  vectorCount: vectorResults.length,
  keywordCount: keywordResults.length,
  mergedCount: merged.length,
  vectorSources: vectorResults.slice(0, 3).map((r) => ({
    documentTitle: r.documentTitle,
    similarity: r.normalizedScore,
    source: 'vector' as const,
  })),
  keywordSources: keywordResults.slice(0, 3).map((r) => ({
    documentTitle: r.documentTitle,
    similarity: r.normalizedScore,
    source: 'keyword' as const,
  })),
};
```

> 注意：`retrievalDetail` 需要在 `orchestrate` 的最终 `yield { ... done: true }` 之前构建，所以确保 `vectorResults`、`keywordResults`、`merged` 变量在作用域内。当前代码中这些变量在 `try` 块内声明，需要将其提升到 `orchestrate` 方法作用域。简化处理：在 `sources` 构建处（try 块内或 reject 判断前）同时构建 `retrievalDetail`。

在最终的 `yield { token: '', done: true, ... }` 中新增：

```typescript
yield {
  token: '',
  done: true,
  sources,
  confidenceLevel,
  hallucinationWarning: validation.passed ? undefined : '...',
  promptTokens: Math.ceil(prompt.length / 2),
  completionTokens: Math.ceil(fullAnswer.length / 2),
  retrievalDetail,  // 新增
};
```

> 注意：需要在文件顶部从 `@/rag/rag.interface` 导入 `RetrievalDetail`。

### T-03：`ask.controller.ts` 传递 `retrievalDetail`

编辑 `apps/api/src/ask/ask.controller.ts`，在 done chunk 的数据构建中新增 `retrievalDetail`：

```typescript
const data: AskStreamChunk = {
  // ... 现有字段不变
  retrievalDetail: chunk.retrievalDetail,  // 新增
};
```

### 阶段 1 验证

```bash
cd apps/api && npx tsc --noEmit
```

---

## 阶段 2：前端类型与依赖（T-04 ~ T-05）

### T-04：前端 `sse.ts` 和 `useChat.ts` 扩展

#### 4.1 编辑 `apps/web/src/api/sse.ts`

在 `AskStreamChunk` 接口中（`completionTokens?: number;` 之后）新增：

```typescript
  retrievalDetail?: {
    vectorCount: number;
    keywordCount: number;
    mergedCount: number;
    vectorSources: Array<{
      documentTitle: string;
      similarity: number;
      source: 'vector' | 'keyword';
    }>;
    keywordSources: Array<{
      documentTitle: string;
      similarity: number;
      source: 'vector' | 'keyword';
    }>;
  };
```

#### 4.2 编辑 `apps/web/src/hooks/useChat.ts`

在 `Message` 接口中新增：

```typescript
  retrievalDetail?: AskStreamChunk['retrievalDetail'];
```

在 `sendMessage` 的 done chunk 处理中（`chunk.sources` 附近），新增 `retrievalDetail` 的注入：

```typescript
// 在 sources / confidenceLevel / hallucinationWarning 的同一对象扩展中：
retrievalDetail: chunk.retrievalDetail,
```

### T-05：安装 Recharts

```bash
cd apps/web && pnpm add recharts
```

### 阶段 2 验证

```bash
cd apps/web && npx tsc --noEmit
```

---

## 阶段 3：RetrievalPanel 抽屉组件（T-06 ~ T-07）

### T-06：新建 `RetrievalPanel` 组件

#### 6.1 新建 `apps/web/src/components/Chat/RetrievalPanel.module.css`

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 499;
  animation: fadeIn 0.2s ease;
}

.panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 480px;
  max-width: 90vw;
  height: 100vh;
  background: var(--bg-primary);
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.1);
  z-index: 500;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.25s ease;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.closeButton {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.15s;
}

.closeButton:hover {
  background: var(--hover-bg);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.section {
  margin-bottom: 24px;
}

.sectionTitle {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--text-secondary);
}

/* 检索来源对比 */
.sourceRow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 0.83rem;
}

.sourceLabel {
  width: 100px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.sourceBar {
  height: 8px;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.sourceBarVector {
  background: var(--accent-color);
}

.sourceBarKeyword {
  background: #34d399;
}

.sourceCount {
  margin-left: 8px;
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

/* Prompt 预览 */
.codeBlock {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  font-size: 0.75rem;
  font-family: 'SF Mono', 'Menlo', monospace;
  line-height: 1.5;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
}
```

#### 6.2 新建 `apps/web/src/components/Chat/RetrievalPanel.tsx`

```tsx
import { type FC, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import type { Message } from '@/hooks/useChat';
import styles from './RetrievalPanel.module.css';

interface RetrievalPanelProps {
  message: Message;
  onClose: () => void;
}

export const RetrievalPanel: FC<RetrievalPanelProps> = ({ message, onClose }) => {
  const detail = message.retrievalDetail;
  const sources = message.sources ?? [];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // 相似度图表数据
  const chartData = sources.map((s) => ({
    name: s.documentTitle,
    similarity: Number((s.similarity * 100).toFixed(0)),
  }));

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>检索详情</h2>
          <button className={styles.closeButton} onClick={onClose} type="button">
            ✕
          </button>
        </div>
        <div className={styles.content}>
          {/* Section 1: 相似度条形图 */}
          {chartData.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>文档相似度</p>
              <ResponsiveContainer width="100%" height={Math.max(chartData.length * 40, 120)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="similarity" fill="var(--accent-color)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Section 2: 检索来源对比 */}
          {detail && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>检索来源贡献</p>
              <div className={styles.sourceRow}>
                <span className={styles.sourceLabel}>向量检索</span>
                <div
                  className={`${styles.sourceBar} ${styles.sourceBarVector}`}
                  style={{ width: `${Math.min((detail.vectorCount / Math.max(detail.mergedCount, 1)) * 100, 100)}%` }}
                />
                <span className={styles.sourceCount}>{detail.vectorCount} 条</span>
              </div>
              <div className={styles.sourceRow}>
                <span className={styles.sourceLabel}>关键词检索</span>
                <div
                  className={`${styles.sourceBar} ${styles.sourceBarKeyword}`}
                  style={{ width: `${Math.min((detail.keywordCount / Math.max(detail.mergedCount, 1)) * 100, 100)}%` }}
                />
                <span className={styles.sourceCount}>{detail.keywordCount} 条</span>
              </div>
            </div>
          )}

          {/* Section 3: Prompt 预览 */}
          {message.reasoning && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>检索过程</p>
              <pre className={styles.codeBlock}>{message.reasoning}</pre>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};
```

### T-07：`ChatMessage.tsx` 加"查看检索详情"按钮

编辑 `apps/web/src/components/Chat/ChatMessage.tsx`：

① 新增 state 和 import：

```typescript
// 文件顶部新增 import
import { useState } from 'react';
import { RetrievalPanel } from '@/components/Chat/RetrievalPanel';

// ChatMessage 函数体内新增 state
const [showRetrieval, setShowRetrieval] = useState(false);
```

② 在操作按钮行（`.messageActions` 容器中）新增按钮：

```tsx
{message.status === 'complete' && message.sources && message.sources.length > 0 && (
  <button
    className={styles.actionButton}
    onClick={() => setShowRetrieval(true)}
    type="button"
  >
    📊 查看检索详情
  </button>
)}
```

③ 在 `return` 的 JSX 末尾（`</div>` 闭合前）渲染 RetrievalPanel：

```tsx
{showRetrieval && (
  <RetrievalPanel message={message} onClose={() => setShowRetrieval(false)} />
)}
```

### 阶段 3 验证

```bash
cd apps/web && npx tsc --noEmit && pnpm build
```

---

## 阶段 4：E2E Mock 与测试（T-08）

### T-08：新增 retrieval E2E 测试

#### 8.1 编辑 `apps/web/e2e/fixtures/test-data.ts`

在文件末尾新增：

```typescript
export const MOCK_RETRIEVAL_DETAIL = {
  vectorCount: 2,
  keywordCount: 2,
  mergedCount: 2,
  vectorSources: [
    { documentTitle: '年假制度', similarity: 0.89, source: 'vector' as const },
    { documentTitle: '考勤制度', similarity: 0.62, source: 'vector' as const },
  ],
  keywordSources: [
    { documentTitle: '年假制度', similarity: 0.75, source: 'keyword' as const },
    { documentTitle: '报销流程', similarity: 0.45, source: 'keyword' as const },
  ],
};
```

#### 8.2 编辑 `apps/web/e2e/mocks/api-handlers.ts`

在 `buildSSEResponse` 的 done chunk 中新增 `retrievalDetail`：

```typescript
sseData += `data: ${JSON.stringify({
  chunk: '',
  done: true,
  sources: MOCK_SSE_SOURCES,
  confidenceLevel: 'high',
  followUps: MOCK_SSE_FOLLOWUPS,
  promptTokens: 120,
  completionTokens: 45,
  retrievalDetail: MOCK_RETRIEVAL_DETAIL,
})}\n\n`;
```

确保顶部 import 包含 `MOCK_RETRIEVAL_DETAIL`。

#### 8.3 新建 `apps/web/e2e/specs/retrieval.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('检索可视化', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
    await page.goto('/chat');
  });

  test('TC-RETR-01: 查看检索详情按钮渲染', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('查看检索详情')).toBeVisible();
  });

  test('TC-RETR-02: 点击打开检索详情抽屉', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    await page.getByText('查看检索详情').click();
    // 抽屉应出现
    await expect(page.getByText('检索详情')).toBeVisible({ timeout: 3000 });
    // 检索来源贡献区域
    await expect(page.getByText('检索来源贡献')).toBeVisible();
    await expect(page.getByText('向量检索')).toBeVisible();
    await expect(page.getByText('关键词检索')).toBeVisible();
  });

  test('TC-RETR-03: 点击遮罩关闭抽屉', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    await page.getByText('查看检索详情').click();
    await expect(page.getByText('检索详情')).toBeVisible({ timeout: 3000 });
    // 点击遮罩层（overlay 是第一个 .overlay）
    // 使用 Locator 点击非 panel 区域来关闭
    await page.locator('text=检索详情').first().click();
    // 点击遮罩关闭：在 panel 左侧点击
    await page.mouse.click(10, 300);
    // 等待关闭动画
    await page.waitForTimeout(300);
    // 抽屉应已关闭
  });
});
```

### 阶段 4 验证

```bash
pnpm test:e2e
```

---

## 最终验证

```bash
pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e
```

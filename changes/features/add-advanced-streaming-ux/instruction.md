# Agent 指令：高级流式 UX（停止生成、重新生成、Token 计数）

> 【执行纪律】本指令包含 6 个 Task，分 3 阶段。严格按序完成，每阶段验证通过再进下一阶段。

---

## 前置阅读

1. `changes/features/add-advanced-streaming-ux/spec.md`
2. `apps/api/src/rag/rag.service.ts`（orchestrate done chunk）
3. `apps/api/src/ask/ask.controller.ts`
4. `apps/web/src/api/sse.ts`
5. `apps/web/src/hooks/useChat.ts`
6. `apps/web/src/pages/ChatPage.tsx`
7. `apps/web/src/components/Chat/ChatMessage.tsx`

---

## 阶段 1：后端 Token 计数（T-01）

### T-01：done chunk 增加 promptTokens/completionTokens

#### 1.1 编辑 `apps/api/src/rag/rag.interface.ts`

在 `StreamChunk` 接口中（`error?: string;` 之后）新增：

```typescript
  promptTokens?: number;
  completionTokens?: number;
```

#### 1.2 编辑 `apps/api/src/ask/ask.interface.ts`

在 `AskStreamChunk` 接口中同样新增 `promptTokens` 和 `completionTokens`。

#### 1.3 编辑 `apps/api/src/rag/rag.service.ts`

在 `orchestrate` 方法的最终 `yield { token: '', done: true, ... }` 中，计算并添加：

```typescript
yield {
  token: '',
  done: true,
  sources,
  confidenceLevel,
  hallucinationWarning: ...,
  promptTokens: Math.ceil(prompt.length / 2),    // 粗略估算
  completionTokens: Math.ceil(fullAnswer.length / 2),
};
```

#### 1.4 编辑 `apps/api/src/ask/ask.controller.ts`

在 `data` 对象中增加传递 `promptTokens` 和 `completionTokens`。

### 阶段 1 验证

```bash
cd apps/api && npx tsc --noEmit
```

---

## 阶段 2：前端停止生成 + 重新生成 + Token 显示（T-02 ~ T-05）

### T-02：前端类型 + useChat 扩展

#### 2.1 编辑 `apps/web/src/api/sse.ts`

在 `AskStreamChunk` 中新增 `promptTokens?` / `completionTokens?`。

#### 2.2 编辑 `apps/web/src/hooks/useChat.ts`

在 `Message` 接口中新增 `promptTokens?` / `completionTokens?`。

在 `done` chunk 处理中新增：

```typescript
if (chunk.promptTokens) {
  setMessages((prev) =>
    prev.map((m) =>
      m.id === assistantMsg.id
        ? { ...m, promptTokens: chunk.promptTokens, completionTokens: chunk.completionTokens }
        : m,
    ),
  );
}
```

新增 `stopGeneration` 方法（暴露在返回值中）：

```typescript
const stopGeneration = useCallback(() => {
  if (abortRef.current) {
    abortRef.current.abort();
  }
}, []);
```

### T-03：停止生成按钮

在 `ChatPage.tsx` 的输入区域，`isLoading` 为 true 时，发送按钮替换为停止按钮：

```tsx
{isLoading ? (
  <button className={styles.stopButton} onClick={stopGeneration} type="button">
    停止
  </button>
) : (
  <button className={styles.sendButton} ...>发送</button>
)}
```

添加 `.stopButton` 样式：红色/橙色背景 + 方形图标。

### T-04：重新生成按钮

#### 4.1 编辑 `ChatMessage.tsx`

在每条 assistant 消息底部添加"重新生成"按钮：

```tsx
{message.role === 'assistant' && message.status === 'complete' && (
  <button className={styles.regenerateButton} onClick={() => onRegenerate?.(message.id)} type="button">
    重新生成
  </button>
)}
```

#### 4.2 编辑 `ChatPage.tsx`

新增 `handleRegenerate` 并传递给 `ChatMessage`：

```tsx
const handleRegenerate = useCallback(
  (assistantMsgId: string) => {
    const userMsg = messages.find((m) => m.role === 'user' && ...);
    if (userMsg) {
      // 移除当前 assistant 消息，重新 send
      setMessages((prev) => prev.slice(0, -1));
      void sendMessage(userMsg.content);
    }
  },
  [messages, sendMessage],
);
```

> 注意：`setMessages` 需要从 `useChat` 中导出或 `handleRegenerate` 逻辑放在 `useChat` 内部。

#### 4.3 添加到 `.module.css`

```css
.regenerateButton {
  padding: 4px 8px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
}
.regenerateButton:hover {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}
```

### T-05：Token 计数显示

#### 5.1 编辑 `ChatMessage.tsx`

在 assistant 消息底部（来源引用之前）添加：

```tsx
{message.promptTokens != null && message.completionTokens != null && (
  <div className={styles.tokenInfo}>
    ~{message.completionTokens} tokens
  </div>
)}
```

#### 5.2 编辑 `ChatPage.tsx`

在消息列表底部（最后一条消息之后）添加总计：

```tsx
const totalPrompt = messages.reduce((sum, m) => sum + (m.promptTokens ?? 0), 0);
const totalCompletion = messages.reduce((sum, m) => sum + (m.completionTokens ?? 0), 0);

{totalCompletion > 0 && (
  <div className={styles.tokenTotal}>
    本轮 · Prompt ~{totalPrompt} | Completion ~{totalCompletion} | 总计 ~{totalPrompt + totalCompletion} tokens
  </div>
)}
```

### 阶段 2 验证

```bash
cd apps/web && npx tsc --noEmit && pnpm build && pnpm vitest run
```

---

## 阶段 3：E2E 测试（T-06）

### T-06：新增 streaming UX E2E 测试

#### 6.1 更新 `apps/web/e2e/mocks/api-handlers.ts`

在 `buildSSEResponse` 的 done chunk 中添加 `promptTokens` 和 `completionTokens`：

```typescript
sseData += `data: ${JSON.stringify({
  chunk: '',
  done: true,
  sources: MOCK_SSE_SOURCES,
  confidenceLevel: 'high',
  followUps: MOCK_SSE_FOLLOWUPS,
  promptTokens: 120,
  completionTokens: 45,
})}\n\n`;
```

#### 6.2 新建 `apps/web/e2e/specs/streaming-ux.spec.ts`

3 个测试用例：
- **TC-STRM-01**：点击停止按钮后 loading 消失
- **TC-STRM-02**：点击重新生成按钮后回答替换
- **TC-STRM-03**：消息底部和总计显示 token 信息

### 阶段 3 验证

```bash
pnpm test:e2e
```

---

## 最终验证

```bash
pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e
```

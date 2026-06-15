# Feature Spec：高级流式 UX（停止生成、重新生成、Token 计数）

> 本 Feature 为 Chat 补全高级流式交互能力：停止生成按钮、重新生成消息、Token 使用量展示。打磨流式 AI Chat 的使用体验，展示对 LLM API 成本模型的认知。
>
> 对应模块：chat-spec.md
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前流式 UX 比较基础：只有一个 streaming cursor + 状态文字。主流 AI 产品（ChatGPT、Claude）在流式交互上有很多细节值得借鉴。作为面试 demo，这些细节能展示你对**用户体验打磨**和**AI 成本模型**的关注。

### 1.2 目标

1. **停止生成**：流式回答过程中显示"停止"按钮，点击后中止 LLM 生成，保留已生成内容
2. **重新生成**：支持对最后一条助手消息重新生成（保留上下文、丢弃旧回答）
3. **Token 计数**：每条消息显示 token 数（prompt tokens + completion tokens），底部总计

### 1.3 明确不做

- 不实现真实的 tokenizer（用字符数 `length / 2 ≈ tokens` 估算）
- 不实现编辑消息后重新生成（v1 仅最后一轮重新生成）
- 不实现多分支（每条重新生成创建新分支）

---

## 2. 技术方案

### 2.1 停止生成

```
useChat.sendMessage()
  ↓ 创建 AbortController（已有）
  ↓
ChatPage 渲染 "停止" 按钮（位置：输入区右侧，替换"生成中..."文本）
  ↓
用户点击停止 → AbortController.abort()
  ↓
useChat catch AbortError → 保留已累积的 content → 状态改为 'complete'
```

**已有基础**：`abortRef.current = new AbortController()` 已在 `useChat.sendMessage` 中。

**改动点**：
- `useChat` 新增 `stopGeneration()` 方法（暴露 abort controller 的 abort 调用）
- `ChatPage` 新增停止按钮，`isLoading` 为 true 时显示

### 2.2 重新生成

```
ChatPage → 每条 assistant 消息底部显示 "重新生成" 图标按钮
  ↓ 点击
useChat.regenerate(messageId)
  ↓ 找到该消息之前的 user 消息
  ↓ 重新调用 sendMessage(userContent)
  ↓ 替换当前 assistant 消息（丢弃旧内容）
```

**已有基础**：`useChat.retryMessage(messageId)` 已有，但逻辑是重试最后一条失败消息。需要在非错误场景也可触发，且 UI 按钮常驻显示。

**改动点**：
- `ChatPage` 中每条 assistant 消息底部加 "重新生成" 图标按钮
- `useChat` 调整 `retryMessage` 逻辑，支持非 error 状态的 regenerate

### 2.3 Token 计数

```
每条消息底部显示：Prompt: ~120 tokens | Completion: ~350 tokens
消息列表底部（欢迎页下方）：总计 ~470 tokens
```

**估算逻辑**：
- `promptTokens`：发送时统计 prompt 长度（可在 SSE 最后一个 chunk 中携带）
- `completionTokens`：按 `answer.length / 2` 粗略估算（中文约 1 char ≈ 0.5 token）
- 后端在 `done` chunk 中新增 `promptTokens` 和 `completionTokens` 字段

### 2.4 接口变更

#### AskStreamChunk（done chunk 新增）

```typescript
export interface AskStreamChunk {
  // ... 现有字段不变
  promptTokens?: number;       // 新增：提示词 token 数
  completionTokens?: number;   // 新增：回答 token 数
}
```

#### Message（前端新增）

```typescript
export interface Message {
  // ... 现有字段不变
  promptTokens?: number;
  completionTokens?: number;
}
```

### 2.5 组件改造

```
ChatPage
├── messageList
│   └── ChatMessage（扩展）
│       ├── 消息内容（现有）
│       ├── 来源引用（现有）
│       ├── 猜你想问（现有）
│       ├── Token 信息：~350 tokens（新增，灰色小字，右侧对齐）
│       └── "重新生成"按钮（新增，hover 时显示，右对齐）
├── statusHint（现有"正在生成回答..." → 改造）
│   ├── spinner（现有）
│   ├── 状态文字（现有）
│   └── "停止"按钮（新增，替代"生成中..."按钮）
└── 底部 Token 总计（新增，消息列表底部）
    └── 总计：Prompt ~450 | Completion ~1,200 | 本轮 ~1,650 tokens
```

---

## 3. 实现任务分解

| Task ID | 描述 | 涉及文件 |
|---------|------|----------|
| T-01 | 后端：`done` chunk 中增加 `promptTokens`/`completionTokens` | `rag.service.ts`, `ask.controller.ts` |
| T-02 | 前端类型：`sse.ts`/`useChat.ts` 扩展 token 字段 + `stopGeneration` 方法 | `sse.ts`, `useChat.ts` |
| T-03 | 前端：停止生成按钮（输入区右侧） | `ChatPage.tsx`, `ChatPage.module.css` |
| T-04 | 前端：重新生成按钮（assistant 消息底部） | `ChatMessage.tsx`, `ChatMessage.module.css` |
| T-05 | 前端：Token 计数显示（消息底部 + 总计） | `ChatMessage.tsx`, `ChatPage.tsx` |
| T-06 | E2E Mock + 测试：stop/regenerate/token 测试 | 更新 mock handlers + 新建 `streaming-ux.spec.ts` |

---

## 4. 测试用例（E2E 新增）

### TC-STRM-01：停止生成
- 发送消息 → 等待 loading → 点击"停止" → loading 消失 → 已生成内容保留 → 输入区可用

### TC-STRM-02：重新生成
- 发送消息 → 等待回答完成 → 点击"重新生成" → 旧回答被替换 → 新回答出现

### TC-STRM-03：Token 计数显示
- 发送消息 → 等待完成 → 消息底部显示 token 估算 → 总计区域显示累计 token

---

## 5. 验收标准

- [ ] 流式生成中显示"停止"按钮，点击后中止并保留内容
- [ ] 每条 assistant 消息底部有"重新生成"按钮，点击后正确替换
- [ ] 消息底部显示 token 估算信息
- [ ] 消息列表底部显示本轮 token 总计
- [ ] 现有 29 个 E2E 测试无回归
- [ ] 新增 3 个 streaming UX E2E 测试全部通过
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

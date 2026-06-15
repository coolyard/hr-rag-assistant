# Feature Spec：在 Chat 中展示 AI 思考过程

> 本 Feature 为聊天对话增加"思考过程"展示功能，让用户在等待 AI 回答时可以看到模型的分析推理过程，提升透明度和用户体验。参考 ChatGPT、DeepSeek、Claude 等主流 AI Chat 产品的思考过程 UI 设计。
>
> 对应模块：chat-spec.md、api-spec.md
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前用户在 Chat 中提问后，前端只显示一个 Loading 动画（跳动圆点）和状态文字（"正在检索相关文档..." → "正在生成回答..."），用户无法感知 AI 在做什么分析、基于什么逻辑得出结论。这在面试演示场景下体验不够好，也缺少了行业主流的"可解释性"亮点。

主流 AI Chat 产品（ChatGPT o1、DeepSeek R1、Claude）都已支持展示思考/推理过程：在一个可折叠的区域中显示模型的中间推理步骤，用户可以展开/收起查看。

### 1.2 目标

1. **后端**：SSE 流中新增 `reasoning` 字段，在回答生成前/并行发送思考内容
2. **前端**：在助手消息气泡内，渲染一个可折叠的"思考过程"区域
3. **UX 友好**：思考中实时流式展示；思考完成后默认折叠，显示摘要；支持点击展开
4. **覆盖已有模块**：保持对现有对话流程（流式消息、来源引用、猜你想问等）的完全兼容

### 1.3 明确不做

- 不引入新的 LLM 模型或提示词工程策略 —— 只用现有的 RAG 检索过程作为"思考"内容
- 不修改数据库 schema
- 不增加新的 API 端点
- 不改变当前消息持久化逻辑

---

## 2. 技术方案

### 2.1 数据流设计

```
用户提问
  ↓
后端 rag.orchestrate()
  ├── Step 1: 向量检索 → yield { reasoning: "正在进行向量语义检索..." }
  ├── Step 2: 关键词检索 → yield { reasoning: "正在进行关键词精确匹配..." }
  ├── Step 3: 结果合并排序 → yield { reasoning: "找到 3 条相关文档，开始综合分析..." }
  ├── Step 4: 个人数据注入 → yield { reasoning: "已匹配到用户张三的个人信息（年假/考勤）..." }
  ├── Step 5: 拒绝检查 → yield { reasoning: "文档相关性低于阈值，将拒绝回答" } 或跳过
  └── Step 6: LLM 生成 → yield { chunk: "根据..." }（现有内容流）
  ↓
前端 SSE 接收
  ├── reasoning 字段 → 追加到 thinkingSection（可折叠区域，实时展示）
  └── chunk 字段 → 追加到 message.content（现有流程不变）
```

### 2.2 接口变更

#### StreamChunk（后端内部，`rag.interface.ts`）

```typescript
export interface StreamChunk {
  token: string;
  done: boolean;
  status?: string;
  reasoning?: string;        // 新增：思考过程文本片段
  followUps?: string[];
  sources?: SourceCitation[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  error?: string;
}
```

#### AskStreamChunk（SSE 传输，`ask.interface.ts`）

```typescript
export interface AskStreamChunk {
  chunk: string;
  done: boolean;
  status?: string;
  reasoning?: string;        // 新增：思考过程文本片段
  followUps?: string[];
  sources?: SourceCitation[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  error?: string;
  conversationId?: string;
}
```

#### sse.ts（前端 SSE 类型）

```typescript
export interface AskStreamChunk {
  // 现有字段不变...
  reasoning?: string;        // 新增：思考过程文本片段
}
```

#### Message（前端 hook，`useChat.ts`）

```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: SourceCitation[];
  followUps?: string[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  error?: string;
  reasoning?: string;        // 新增：完整的思考过程文本
}
```

### 2.3 组件结构

```
ChatMessage (assistant)
├── 思考过程区域（新增）
│   ├── 折叠头部：chevron 图标 + "思考过程" + 时间文本 + 展开/折叠指示
│   └── 折叠内容：reasoning 文本（小号字体，引用块样式，左边框强调线）
├── 消息正文区域（现有）
│   ├── Loading dots（无内容时）
│   ├── Markdown 渲染（有内容时）
│   └── Streaming cursor（流式时）
├── 错误提示（现有）
├── 幻觉警告（现有）
├── 来源引用（现有）
└── 猜你想问（现有）
```

### 2.4 UI 行为规范

| 状态 | 行为 |
|------|------|
| 思考中（reasoning 流式输入中） | 默认展开，实时滚动显示最新内容，头部显示 "思考中..." |
| 思考完成，回答生成中 | 保持展开，头部显示 "✓ 思考完成" |
| 回答也完成 | 自动折叠，头部显示 "✓ 思考过程" |
| 用户点击头部 | 切换展开/折叠状态 |
| 没有 reasoning 内容 | 不渲染思考过程区域（向后兼容） |

### 2.5 视觉设计

参考 ChatGPT / DeepSeek 思考过程的设计模式：

- **折叠头部**：`var(--bg-secondary)` 背景，`border-radius: 8px`，flex 布局，hover 时背景加深，cursor: pointer
- **折叠内容**：`var(--bg-secondary)` 背景，左边框 `2px solid var(--accent-color)`，`padding: 10px 12px`
- **文本样式**：`font-size: 0.83rem`，`color: var(--text-secondary)`，`line-height: 1.5`
- **Chevron 图标**：折叠时向右 ▶（或 `ChevronRight`），展开时向下 ▼（或 `ChevronDown`），使用 CSS 或内联 SVG
- **过渡动画**：`max-height` + `opacity` 过渡，`transition: all 0.2s ease`
- **间距**：与消息正文之间 `margin-bottom: 10px`

---

## 3. 实现任务分解

| Task ID | 描述 | 涉及文件 |
|---------|------|----------|
| T-01 | 后端接口层：`StreamChunk` / `AskStreamChunk` 增加 `reasoning` 字段 | `rag.interface.ts`, `ask.interface.ts` |
| T-02 | 后端业务层：`rag.service.ts` orchestrate 各阶段 yield reasoning | `rag.service.ts` |
| T-03 | 后端传输层：`ask.controller.ts` 传递 `reasoning` 到 SSE | `ask.controller.ts` |
| T-04 | 前端类型层：`sse.ts` 和 `useChat.ts` 的 Message/AskStreamChunk 增加 reasoning | `sse.ts`, `useChat.ts` |
| T-05 | 前端组件：`ChatMessage.tsx` 新增 ThinkingSection，包含折叠展开交互 | `ChatMessage.tsx` |
| T-06 | 前端样式：`ChatMessage.module.css` 新增思考过程 CSS 样式 | `ChatMessage.module.css` |
| T-07 | E2E Mock 更新：`test-data.ts` / `api-handlers.ts` 增加 reasoning mock 数据 | `test-data.ts`, `api-handlers.ts` |
| T-08 | E2E 测试更新：新增 5 个思考过程测试用例，更新 chat spec | `chat.spec.ts`, 新增 `thinking.spec.ts` |

---

## 4. 测试用例（E2E 新增）

### TC-REASON-01：思考过程区域渲染
- **前置**：Employee 登录，进入 Chat 页面
- **步骤**：发送一条消息
- **预期**：助手消息气泡中出现"思考过程"可折叠区域

### TC-REASON-02：思考中默认展开
- **前置**：Employee 登录
- **步骤**：发送消息
- **预期**：思考过程区域默认展开，内容实时更新（不是空白的）

### TC-REASON-03：思考完成后可折叠
- **前置**：Employee 登录
- **步骤**：发送消息 → 等待流式完成
- **预期**：回答完成后，思考过程区域折叠，显示"思考过程"头部

### TC-REASON-04：点击切换展开/折叠
- **前置**：回答已完成（折叠状态）
- **步骤**：点击"思考过程"头部
- **预期**：区域展开 → 再次点击 → 区域折叠

### TC-REASON-05：思考过程不影响现有功能
- **前置**：发送消息
- **步骤**：验证消息正文、来源引用、猜你想问均正常渲染
- **预期**：所有现有功能（来源引用、猜你想问按钮、Markdown 渲染）不受影响

---

## 5. 验收标准

- [ ] SSE 流中包含 `reasoning` 字段，后端在检索/分析各阶段 emit reasoning 内容
- [ ] 前端 `useChat` 正确处理 `reasoning` chunk，累积到 `message.reasoning`
- [ ] `ChatMessage` 渲染可折叠"思考过程"区域，支持展开/折叠交互
- [ ] 思考中默认展开，完成后折叠
- [ ] 视觉风格与现有设计系统一致
- [ ] 亮色/暗色主题下均可正常显示
- [ ] 现有 25 个 E2E 测试全部通过（回归）
- [ ] 新增 5 个思考过程 E2E 测试全部通过
- [ ] `pnpm lint && pnpm format:check` 通过
- [ ] `pnpm build` 成功

# 模块 Spec：Chat（对话模块）

> 本模块定义 Chat 对话的全链路规范，是用户与 AI 交互的核心界面。涵盖前端 UI、SSE 流式通信、消息状态管理、多轮对话。
>
> 对应变更域：phase-2-rag-engine（SSE + 对话历史）+ phase-3-user-experience（UI）

---

## 1. 范围边界

### 1.1 包含
- 前端：Chat 页面布局、消息列表、输入框、发送按钮、来源引用展示
- 前端：useChat Hook（SSE 连接、消息状态、发送/重试/清除）
- 前端：多轮对话历史展示、消息气泡样式
- 后端：SSE 流式接口 `POST /api/ask`
- 后端：对话历史管理（内存存储）
- 后端：LLM 生成调用 + Prompt 组装

### 1.2 不包含
- ❌ RAG 检索算法细节（见 rag-spec.md）
- ❌ Embedding 生成（见 embedding-spec.md）
- ❌ 文档上传（见 document-spec.md）
- ❌ 热门问题推荐（见 extension-spec.md）
- ❌ MCP 协议（见 extension-spec.md）

---

## 2. 数据模型

### 2.1 消息模型

```typescript
interface Message {
  id: string;                    // 消息唯一 ID，如 `msg-${timestamp}-${random}`
  role: 'user' | 'assistant' | 'system';
  content: string;               // 消息内容（Markdown 格式）
  timestamp: number;             // 发送时间戳
  sources?: SourceCitation[];    // 来源引用（仅 assistant 消息）
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  error?: string;                // 错误信息
}

interface SourceCitation {
  documentName: string;          // 如 "年假制度.md"
  documentTitle: string;         // 如 "年假制度"
  category: string;              // 如 "annual_leave"
  chunk: string;                 // 引用的原文片段
  similarity: number;            // 相似度分数，如 0.89
}
```

### 2.2 对话会话模型

```typescript
interface Conversation {
  id: string;                    // 会话 ID，如 `conv-${timestamp}-${random}`
  title: string;                 // 会话标题（首条用户消息前 20 字）
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ConversationListItem {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}
```

### 2.3 请求/响应模型

```typescript
// POST /api/ask — 请求体
interface AskRequest {
  question: string;              // 用户问题
  conversationId?: string;       // 可选，为空则创建新会话
}

// 后端内部扩展：AskRequest 携带用户 ID（从 JWT 解析）
interface AskContext {
  userId: string;                // 从 JWT payload.sub 提取
  question: string;
  conversationId?: string;
}

// SSE 流式数据包
interface AskStreamChunk {
  chunk: string;                 // 文本片段
  done: boolean;                 // 是否结束
  sources?: SourceCitation[];    // 结束包携带来源
  error?: string;                // 错误信息
}

// GET /api/ask/history/:conversationId — 响应
interface HistoryResponse {
  conversationId: string;
  messages: Message[];
}

// DELETE /api/ask/history/:conversationId — 响应
interface ClearHistoryResponse {
  success: boolean;
  conversationId: string;
}
```

---

## 3. 后端接口规范

### 3.1 POST /api/ask（SSE 流式）

| 属性 | 值 |
|------|-----|
| 路径 | `/api/ask` |
| 方法 | POST |
| 认证 | Bearer JWT |
| Content-Type | `application/json` |
| 响应类型 | `text/event-stream`（SSE） |

**请求体**：
```json
{
  "question": "年假怎么请？",
  "conversationId": "conv-123456-abc"
}
```

**SSE 流式响应**：

```
data: {"chunk": "根据", "done": false}

data: {"chunk": "《年假制度》", "done": false}

data: {"chunk": "，年假需要提前3天申请", "done": false}

...

data: {"chunk": "", "done": true, "sources": [{"documentName": "年假制度.md", "documentTitle": "年假制度", "category": "annual_leave", "chunk": "年假需提前3天申请...", "similarity": 0.89}]}
```

**错误响应（SSE 格式）**：
```
data: {"chunk": "", "done": true, "error": "生成超时，请稍后重试"}
```

### 3.2 后端数据流

```
接收 POST /api/ask
    │
    ▼
AuthGuard 验证 JWT
    │
    ▼
提取 conversationId，无则创建新会话
    │
    ▼
RAGService.orchestrate(question)
    ├── EmbeddingService.embed(question) → 768 维向量
    ├── VectorStore.search(embedding) → 向量检索 Top-3
    ├── KeywordSearch.search(question) → 关键词检索 Top-3
    ├── Merge & Deduplicate → 最终 Top-3
    │
    ▼
检查最高相似度 < 0.5？
    ├── 是 → 直接返回拒绝话术（不调用 LLM）
    └── 否 → 继续
    │
    ▼
组装 Prompt（System Prompt + 历史 + 检索片段 + 当前问题）
    │
    ▼
LLMService.generate(prompt, history) → SSE 流式
    │
    ▼
逐 chunk 推送给前端
    │
    ▼
结束包携带 sources 信息
    │
    ▼
保存 assistant 消息到对话历史
```

### 3.3 GET /api/ask/history/:conversationId

| 属性 | 值 |
|------|-----|
| 路径 | `/api/ask/history/:conversationId` |
| 方法 | GET |
| 认证 | Bearer JWT |

**响应 200**：
```json
{
  "conversationId": "conv-123456-abc",
  "messages": [
    { "id": "msg-1", "role": "user", "content": "年假怎么请？", "timestamp": 1715900000000 },
    { "id": "msg-2", "role": "assistant", "content": "根据《年假制度》...", "timestamp": 1715900005000, "sources": [...] }
  ]
}
```

### 3.4 DELETE /api/ask/history/:conversationId

| 属性 | 值 |
|------|-----|
| 路径 | `/api/ask/history/:conversationId` |
| 方法 | DELETE |
| 认证 | Bearer JWT |

**响应 200**：
```json
{
  "success": true,
  "conversationId": "conv-123456-abc"
}
```

---

## 4. 前端规范

### 4.1 useChat Hook 接口

```typescript
interface UseChatReturn {
  messages: Message[];                    // 当前会话消息列表
  inputValue: string;                     // 输入框值
  setInputValue: (value: string) => void;
  isLoading: boolean;                     // 是否正在生成回答
  sendMessage: (content: string) => void; // 发送消息
  retryMessage: (messageId: string) => void; // 重试某条消息
  clearConversation: () => void;          // 清空当前对话
  conversationId: string | null;
  conversations: ConversationListItem[];  // 会话列表（侧边栏）
  loadConversation: (id: string) => void; // 切换到指定会话
  newConversation: () => void;            // 创建新会话
}

function useChat(): UseChatReturn;
```

### 4.2 消息状态机

```
用户输入 → 创建 user 消息（status: 'complete'）
    │
    ▼
创建 assistant 占位消息（status: 'sending', content: ''）
    │
    ▼
建立 SSE 连接 → assistant status: 'streaming'
    │
    ▼
接收 chunk → 追加到 content
    │
    ▼
接收 done → status: 'complete'，填充 sources
    │
    ▼
发生错误 → status: 'error'，填充 error
```

### 4.3 多轮对话管理

- **历史保留**：最近 5 轮对话（10 条消息：5 user + 5 assistant）
- **超出截断**：当总 Token 估计超过限制时，保留最近 3 轮
- **会话隔离**：不同 `conversationId` 的消息互不干扰
- **新会话**：首次提问或用户点击"新对话"时创建

### 4.4 输入框规范

- **高度**：默认单行，最多 5 行自动增高
- **发送方式**：Enter 发送，Shift+Enter 换行
- **空内容**：禁止发送空白消息
- **长度限制**：单条消息最多 500 字符
- **加载状态**：发送后输入框清空，显示加载中
- **禁用状态**：生成中输入框可输入但发送按钮禁用

---

## 5. UI 规范

### 5.1 Chat 页面布局

```
┌─────────────────────────────────────────────┐
│  顶部导航栏（Logo + 页面入口 + ThemeToggle + 用户菜单）  │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│           消息列表区域（可滚动）                │
│                                             │
│    ┌──────────────────────────────┐        │
│    │ 💬 用户消息（蓝色，右对齐）      │        │
│    └──────────────────────────────┘        │
│                                             │
│    ┌──────────────────────────────┐        │
│    │ 🤖 助手消息（灰色，左对齐）      │        │
│    │ Markdown 渲染                  │        │
│    │ ┌────────────────────────┐   │        │
│    │ │ 📄 来源引用卡片         │   │        │
│    │ └────────────────────────┘   │        │
│    └──────────────────────────────┘        │
│                                             │
├─────────────────────────────────────────────┤
│  [热门问题推荐]（可选展示）                    │
├─────────────────────────────────────────────┤
│  ┌────────────────────────────┐ [发送按钮]  │
│  │ 输入框...                    │            │
│  └────────────────────────────┘            │
└─────────────────────────────────────────────┘
```

### 5.2 消息气泡规范

**用户消息**：
- 对齐：右对齐
- 背景：`var(--user-message-bg)`（浅色 `#1976d2`，深色 `#1565c0`）
- 文字：`var(--user-message-text)`（白色）
- 圆角：左上、左下、右下圆角，右上小圆角
- 最大宽度：70%
- 内边距：12px 16px

**助手消息**：
- 对齐：左对齐
- 背景：`var(--assistant-message-bg)`
- 文字：`var(--assistant-message-text)`
- 圆角：右上、左下、右下圆角，左上小圆角
- 最大宽度：85%
- 内边距：12px 16px

### 5.3 来源引用卡片（SourceCitation）

- **展示时机**：assistant 消息生成完毕后
- **样式**：
  - 边框：1px solid `var(--border-color)`
  - 背景：略深于消息背景
  - 圆角：8px
  - 内边距：12px
- **内容**：
  - 文档图标 + 文档名（如 "📄 年假制度"）
  - 相似度标签（如 "相似度 89%"）
  - 引用片段预览（最多 2 行，超出省略）
- **交互**：点击卡片可展开查看完整片段

### 5.4 加载/空状态

- **发送中**：输入框下方显示"正在检索文档..."
- **生成中**：助手消息位置显示脉冲动画（●●●）
- **首次进入**：显示欢迎语 + 热门问题推荐
- **空对话**：提示"有什么可以帮您的？"

### 5.5 错误状态

- **网络错误**：消息下方红色提示"发送失败，点击重试"
- **生成超时**：助手消息显示"生成超时，请稍后重试"
- **Ollama 未连接**：顶部全局提示"本地模型服务未连接"

---

## 6. SSE 前端实现规范

### 6.1 EventSource 封装

```typescript
// 使用原生 EventSource，不支持自定义 header，因此：
// 方案：token 放在 URL query 参数，或改用 fetch + ReadableStream

// 推荐方案：fetch + ReadableStream
async function* streamAsk(request: AskRequest): AsyncGenerator<AskStreamChunk> {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(request),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const data = line.replace(/^data: /, '');
      if (data) yield JSON.parse(data);
    }
  }
}
```

### 6.2 流式渲染优化

- 每个 chunk 直接追加到 DOM，不等待完整响应
- 使用 `requestAnimationFrame` 节流渲染（每 16ms 最多一次）
- Markdown 解析在流式过程中可实时预览，结束后完整渲染

### 6.3 SSE 生命周期管理

**取消生成**：
- 前端：用户点击"停止生成"按钮或发送新消息时，调用 `AbortController.abort()` 中断 fetch 请求
- 后端：监听 `req.on('close')` 事件，客户端断开时立即取消 Ollama 生成请求并清理资源
- 已接收的部分内容保留在消息列表中，不删除

**超时处理**：
- 后端：LLM 生成超时 60 秒，超时后发送 error 包并关闭 SSE 连接
- 前端：60 秒内未收到任何 chunk，视为超时，显示"生成超时"并自动清理连接

**心跳保活**：
- 后端：每 15 秒发送 SSE comment（`: heartbeat`），防止代理/负载均衡器断开空闲连接
- 前端：忽略 SSE comment 行，不影响消息渲染

**重连策略**：
- SSE 连接意外断开时：
  1. 前端显示"连接中断，点击重试"提示
  2. 用户点击重试 → 重新发送完整请求（创建新的 SSE 连接）
  3. 不使用自动重连（避免重复生成）
  4. 已接收的部分内容保留，重试后从头开始流式输出

**并发控制**：
- 后端：同一 conversationId 最多 1 个活跃 SSE 连接（新连接到达时取消旧连接）
- 前端：发送新消息前检查 `isLoading`，生成期间禁止发送

---

## 7. 错误处理

| 场景 | 前端行为 | 后端行为 |
|------|---------|---------|
| 问题为空/仅空白 | 禁止发送，输入框抖动提示 | — |
| 问题超长（>500字） | 截断提示，禁止发送 | — |
| 检索无结果（相似度<0.5） | 显示拒绝话术，无来源卡片 | 不调用 LLM，直接返回拒绝话术 |
| LLM 生成超时（>30s） | 显示"生成超时，请稍后重试" | SSE 发送 error 包后关闭 |
| Ollama 未启动 | 顶部显示红色警告 | 返回 503 |
| SSE 连接断开 | 显示"连接中断，点击重试" | — |
| JWT 失效 | 跳转登录页 | 401 |

---

## 8. 验收标准

- [ ] 输入"年假怎么请"，首字延迟 < 8 秒（含检索 + Prompt 组装 + LLM 首 Token）
- [ ] 回答以打字机效果逐字显示，不卡顿
- [ ] 回答结束后，下方显示来源引用卡片（文档名 + 相似度）
- [ ] 追问"那病假呢？"，能承接上文正确回答
- [ ] 输入"公司食堂在哪里"，返回拒绝话术
- [ ] 输入"张三的工资是多少"，返回拒绝话术
- [ ] 发送消息后输入框清空，显示加载状态
- [ ] 生成过程中可以输入新消息但发送按钮禁用
- [ ] Markdown 格式正确渲染（列表、加粗、代码块等）
- [ ] 深色模式下消息气泡对比度舒适
- [ ] 刷新页面后，当前对话历史保留（从后端重新加载）
- [ ] 点击"清空对话"，消息列表清空，conversationId 更新

---

## 9. 与其他模块的关系

```
ChatModule
    ├── 依赖 AuthModule（JWT 鉴权）
    ├── 依赖 RAGModule（检索 + Prompt 组装）
    ├── 依赖 LLMService（流式生成）
    ├── 依赖 EmbeddingService（问题向量化）
    ├── 依赖 VectorStore（向量检索）
    └── 提供 UI 给用户直接交互
```

---

## 10. Spec 演进记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-18 | v1.0 | 初始版本，合并 phase-2 和 phase-3 中 Chat 相关规范 |

# Phase 2 Tasks — AI 核心引擎

## Task Execution Order

```
Phase 1 (全部完成)
    │
    ▼
Task-004 (RAG 检索引擎) ── 依赖 Task-002 (Embedding) + Task-003 (VectorStore)
    │
    ▼
Task-005 (多轮对话 + LLM) ── 依赖 Task-002 (LLM Service) + Task-004 (RAG Pipeline)
    │
    ▼
Task-006 (SSE API + 前端) ── 依赖 Task-005 (生成逻辑) + Task-001 (前端项目)
```

> Task-004 是 Phase 2 的核心，Task-005 和 Task-006 严格串行依赖它。不可并行执行。

---

## Task-004: RAG 编排服务（检索 + 合并）

- **目标**：实现完整的 RAG Pipeline：Embedding → 向量检索 + 关键词检索 → 合并去重 → Top-3
- **输入**：AI-SPEC.md 检索参数（阈值 0.5、权重 0.4/0.6）、Task-003 的 VectorStore
- **输出**：
  - `apps/api/src/rag/rag.service.ts` — 核心编排逻辑
  - `apps/api/src/rag/keyword-search.service.ts` — 预定义关键词匹配
  - `apps/api/src/rag/rag.module.ts`
- **验收标准**：
  - [ ] 输入"年假怎么请"，返回 Top-3 文档片段，包含来源文件名和相似度分数
  - [ ] 输入"公司食堂在哪里"（无关问题），返回空数组（最高相似度 < 0.5）
  - [ ] 混合检索权重正确：向量 0.4 + 关键词 0.6
- **预计耗时**：3-4 小时

## Task-005: 多轮对话与 LLM 生成服务

- **目标**：实现多轮对话管理 + LLM 调用（System Prompt + 历史 + 检索片段）
- **输入**：AI-SPEC.md Prompt 模板、Task-002 的 LLMService
- **输出**：
  - `apps/api/src/chat/chat.service.ts` — 对话历史管理
  - `apps/api/src/chat/conversation-store.service.ts` — 内存会话存储
  - `apps/api/src/rag/rag.service.ts` 扩展 — 组装 Prompt 并调用 LLM
  - `apps/api/src/chat/chat.module.ts`
- **验收标准**：
  - [ ] 单轮问答：输入"年假怎么请"，返回基于文档的回答 + 来源引用
  - [ ] 多轮问答：追问"那病假呢？"，能承接上文
  - [ ] 拒绝场景：输入"张三的工资是多少"，返回 AI-SPEC 定义的拒绝话术
  - [ ] LLM 配置：Temperature = 0.3，流式输出
- **预计耗时**：4-5 小时

## Task-006: SSE 流式 API 与前端对接

- **目标**：实现 `POST /api/ask` SSE 流式接口，前端能逐字渲染回答
- **输入**：Task-005 的生成逻辑、ARCHITECTURE.md 数据流
- **输出**：
  - `apps/api/src/ask/ask.controller.ts` — SSE 流式 Controller
  - `apps/web/src/hooks/useChat.ts` — SSE 连接、消息状态管理
  - `apps/web/src/api/sse.ts` — SSE 客户端封装
  - `apps/web/src/components/Chat/ChatMessage.tsx` — 消息渲染（支持 Markdown）
- **验收标准**：
  - [ ] 前端输入问题，点击发送，首字延迟 < 8 秒（含检索 + LLM 首 Token）
  - [ ] 回答以打字机效果逐字显示，不卡顿
  - [ ] 回答结束后，下方显示来源引用
  - [ ] 支持 Markdown 渲染
- **预计耗时**：4-5 小时

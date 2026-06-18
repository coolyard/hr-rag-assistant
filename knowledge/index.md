# HR RAG 项目知识库

## 技术深度解析

- [HR-RAG-全栈技术深度解析.md](./HR-RAG-全栈技术深度解析.md) — 项目技术全景

## 核心模块

### RAG Pipeline

| 模块       | 路径                                         | 说明                       |
| ---------- | -------------------------------------------- | -------------------------- |
| 向量检索   | `apps/api/src/vector/`                       | 内存向量存储 + 余弦相似度  |
| 关键词检索 | `apps/api/src/rag/keyword-search.service.ts` | HR 关键词精确匹配          |
| 混合排序   | `apps/api/src/rag/rag.service.ts`            | 加权融合 + 阈值过滤        |
| Embedding  | `apps/api/src/embed/`                        | Ollama nomic-embed-text    |
| LLM        | `apps/api/src/llm/`                          | Ollama qwen2.5:7b-instruct |

### 前端组件

| 页面                | 路径                                         | 说明             |
| ------------------- | -------------------------------------------- | ---------------- |
| ChatPage            | `apps/web/src/pages/ChatPage.tsx`            | 对话页面（核心） |
| DocumentPage        | `apps/web/src/pages/DocumentPage.tsx`        | 文档管理         |
| ProfilePage         | `apps/web/src/pages/ProfilePage.tsx`         | 个人中心         |
| EvaluationDashboard | `apps/web/src/pages/EvaluationDashboard.tsx` | 评估 Dashboard   |

### 后端模块

| 模块         | 路径                         | 说明           |
| ------------ | ---------------------------- | -------------- |
| Ask          | `apps/api/src/ask/`          | SSE 流式问答   |
| Auth         | `apps/api/src/auth/`         | JWT 认证       |
| Chat         | `apps/api/src/chat/`         | 对话管理       |
| Conversation | `apps/api/src/conversation/` | CRUD API       |
| Document     | `apps/api/src/document/`     | 文档上传       |
| Eval         | `apps/api/src/eval/`         | 评估引擎       |
| Tool         | `apps/api/src/tool/`         | Agent 工具调用 |

## 开发工作流

### Spec-Driven 开发

每个功能先在 `changes/features/{name}/` 创建：

1. `spec.md` — 需求规格
2. `instruction.md` — Agent 执行指令
3. `pr.md` — PR 描述模板

### 提交验证

```bash
pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e
```

### CI/CD

- `.github/workflows/ci.yml` — quality + e2e 双 Job
- `.github/workflows/release.yml` — Release Please 自动发版
- `.github/workflows/release-pr.yml` — 自动创建 develop→main PR

## 版本历史

| 版本 | 主要变更                                       |
| ---- | ---------------------------------------------- |
| v1.2 | RAG 检索可视化、评估闭环、Tool Use、对话持久化 |
| v1.1 | 思考过程、高级流式 UX、Error Boundary          |
| v1.0 | 基础 RAG、SSE 流式、多轮对话                   |

# 系统架构

## 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                      前端 (React 18 + Vite)               │
│  ChatPage │ DocumentPage │ ProfilePage │ EvalDashboard  │
│  Lazy Loading │ Error Boundary │ CSS Modules             │
├──────────────────────────────────────────────────────────┤
│                    SSE Stream (fetch API)                  │
├──────────────────────────────────────────────────────────┤
│                    后端 (NestJS 10)                       │
│                                                          │
│  Ask Controller ──→ RAG Service ──→ LLM Service          │
│                   │            │                          │
│                   │            ├── Embedding Service      │
│                   │            ├── Vector Store           │
│                   │            ├── Keyword Search         │
│                   │            └── User Profile           │
│                   │                                      │
│                   ├── Chat Service ──→ Conversation Store │
│                   ├── Eval Service ──→ Judge Service      │
│                   └── Tool Registry                       │
│                                                          │
│               Prisma ORM ──→ SQLite                       │
├──────────────────────────────────────────────────────────┤
│                      外部服务                             │
│  Ollama (qwen2.5:7b-instruct / nomic-embed-text)        │
└──────────────────────────────────────────────────────────┘
```

## 数据流

```
用户提问 → Embedding → 向量检索 (Top-3)
                    → BM25 关键词检索 (Top-3)
                    → 混合排序 (Merge Top-3)
                    → 个人数据注入（如适用）
                    → 相似度检查 (Threshold 0.5)
                    → LLM 生成 (qwen2.5, temp=0.3)
                    → SSE 流式返回
```

## 关键设计决策

| 决策     | 选择                       | 原因                       |
| -------- | -------------------------- | -------------------------- |
| 前端框架 | React 18 + Vite            | HMR 快，生态好             |
| 后端框架 | NestJS                     | 模块化 DI，TypeScript 原生 |
| 数据库   | SQLite                     | 零配置本地开发             |
| ORM      | Prisma                     | 类型安全，迁移简单         |
| LLM      | Ollama 本地                | 无需 API key，离线可用     |
| 样式     | CSS Modules                | 无运行时开销，方案轻量     |
| 测试     | Vitest + Jest + Playwright | 前端/后端/E2E 全覆盖       |
| 图表     | 纯 SVG                     | 无第三方依赖               |
| CI/CD    | GitHub Actions             | 双 Job + 自动 Release PR   |

# Phase 1 Tasks — 技术基建

## Task Execution Order

```
[MUST COMPLETE FIRST]
Task-001 (项目结构)
    │
    ▼
Task-002 (Ollama 连通) ── 依赖 Task-001
    │
    ▼
Task-003 (文档索引) ── 依赖 Task-001 + Task-002
```

> Task-001 是整个项目的基础，必须先完成。Task-002 和 Task-003 都依赖 Task-001 提供的 NestJS 骨架。

---

## Task-001: 初始化 NestJS + React 项目结构
- **目标**：搭建 Monorepo 基础结构，配置 TypeScript 严格模式
- **输入**：ARCHITECTURE.md 模块划分、.cursorrules 技术栈约束
- **输出**：
  - `/apps/api/` — NestJS 项目
  - `/apps/web/` — React + Vite 项目
  - `tsconfig.json` — 严格模式配置
  - `package.json` — workspace 配置
  - `eslint.config.mjs` — monorepo 共享 ESLint flat config
  - `.prettierrc` + `.prettierignore` — Prettier 配置
- **验收标准**：
  - [ ] `cd apps/api && npm run start:dev` 能启动 NestJS，监听 3000 端口
  - [ ] `cd apps/web && npm run dev` 能启动 Vite，显示默认 React 页面
  - [ ] TypeScript 编译无错误，无 `any` 类型
  - [ ] `pnpm lint` 无 ESLint 错误
  - [ ] `pnpm format:check` 无格式差异
- **预计耗时**：2-3 小时

## Task-002: 配置 Ollama 客户端与模型连通性
- **目标**：后端能成功调用本地 Ollama 的 Embedding 和 Generate API
- **输入**：AI-SPEC.md 模型配置、ARCHITECTURE.md ADR-002
- **输出**：
  - `apps/api/src/llm/llm.service.ts` — 实现 `ILLMService` 接口
  - `apps/api/src/embed/embed.service.ts` — 实现 `IEmbeddingService` 接口
  - `apps/api/src/llm/llm.module.ts` 和 `embed.module.ts`
  - 健康检查接口 `GET /api/health/ollama`
- **验收标准**：
  - [ ] 调用 Ollama `nomic-embed-text`，输入"年假怎么请"，返回 768 维真实向量
  - [ ] 调用 Ollama `qwen2.5:7b`，输入"你好"，返回真实中文回答（SSE 流式）
  - [ ] `/api/health/ollama` 返回 `{ status: 'ok', models: ['qwen2.5:7b', 'nomic-embed-text'] }`
- **预计耗时**：2-3 小时

## Task-003: 内置文档加载与真实 Embedding 索引
- **目标**：启动时自动加载 `docs/hr-documents/` 下的 5 个内置 HR 文档，分块，生成真实 Embedding，存入内存 VectorStore
- **输入**：AI-SPEC.md 分块策略、ARCHITECTURE.md IVectorStore 接口、5 个内置 Markdown 文件
- **输出**：
  - `apps/api/src/document/document-loader.service.ts` — 读取 Markdown，按 `##` 分块
  - `apps/api/src/vector/vector-store.service.ts` — 实现 `IVectorStore`（内存 Map 存储）
  - `apps/api/src/document/document.module.ts`
- **验收标准**：
  - [ ] 启动后端时，控制台显示"已加载 5 个文档，共 XX 个片段，已建立 Embedding 索引"
  - [ ] 内存 VectorStore 中能通过 ID 查询到向量，维度为 768
  - [ ] 向量值是 Ollama 返回的真实语义向量
  - [ ] 能正确识别 5 个文档的分类（年假/报销/晋升/考勤/福利）
- **预计耗时**：3-4 小时

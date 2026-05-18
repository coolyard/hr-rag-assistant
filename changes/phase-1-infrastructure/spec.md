# 变更域：技术基建（phase-1-infrastructure）

> 本变更域包含项目的底层技术基建，不直接面向最终用户，但所有后续功能依赖它。
> 范围：项目结构搭建、Ollama 本地模型连通、内置 HR 文档加载与真实 Embedding 索引。

---

## 1. 范围边界

### 包含

- NestJS + React + TypeScript 项目结构初始化
- Ollama HTTP 客户端封装（LLM + Embedding）
- 内置 5 个 HR 制度 Markdown 文档加载与分块
- 真实 Embedding 生成与内存向量索引

### 不包含

- RAG 检索算法（phase-2）
- 用户界面（phase-3）
- 文档上传功能（phase-3）
- MCP 协议（phase-4）

---

## 2. 依赖的前置域

- 无（本项目第一个变更域）

---

## 3. 验收标准

- [ ] `cd apps/api && npm run start:dev` 能启动 NestJS，监听 3000 端口
- [ ] `cd apps/web && npm run dev` 能启动 Vite，显示默认 React 页面
- [ ] TypeScript 编译无错误，无 `any` 类型
- [ ] 调用 Ollama `nomic-embed-text`，输入"年假怎么请"，返回 768 维真实向量
- [ ] 调用 Ollama `qwen2.5:7b-instruct`，输入"你好"，返回真实中文回答（SSE 流式）
- [ ] 启动后端时，自动加载 `docs/hr-documents/` 目录下的 5 个内置 HR 文档
- [ ] 控制台显示"已加载 5 个文档，共 XX 个片段，已建立 Embedding 索引"
- [ ] 内存 VectorStore 中能通过 ID 查询到向量，维度为 768
- [ ] 向量值是 Ollama 返回的真实语义向量
- [ ] `pnpm lint` 全项目无 ESLint 错误
- [ ] `pnpm format:check` 全项目无格式差异

---

## 4. 技术决策

- 使用 pnpm workspace 管理 Monorepo
- 使用 ESLint flat config (eslint.config.mjs) + Prettier 统一代码风格
- 前端和后端共享相同的 Prettier 配置，ESLint 规则按运行环境区分
- Ollama 客户端使用原生 `fetch` / `axios`，不引入 SDK 封装
- 文档分块按 Markdown `##` 标题切分，最大 512 字符，重叠 50 字符
- 内置 5 个文档作为初始知识库，启动时自动索引
- HR 文档路径：`docs/hr-documents/`（项目根目录，非 apps/api/docs/）

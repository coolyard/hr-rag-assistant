# HR RAG Assistant — 企业 HR 智能助手

基于 RAG（Retrieval-Augmented Generation）的企业 HR 智能问答系统。前端 React 18 + Vite，后端 NestJS + Prisma + Ollama，完整覆盖 **RAG 全链路** + **Agent 工具调用** + **评估闭环**。

## 技术栈

| 层    | 技术                                                        |
| ----- | ----------------------------------------------------------- |
| 前端  | React 18, TypeScript, Vite, CSS Modules, Vitest, Playwright |
| 后端  | NestJS 10, Prisma 5, SQLite, Jest                           |
| AI    | Ollama (qwen2.5), 本地 Embedding, 混合检索 (向量 + 关键词)  |
| CI/CD | GitHub Actions (quality + e2e + release PR)                 |

## 已实现功能

### RAG 核心

- 向量语义检索 + 关键词精确匹配 + 混合排序
- SSE 流式回答 + 思考过程展示 + Token 计数
- 自动拒绝低相似度问题
- 检索可视化面板（相似度条形图 + 向量/关键词贡献对比）

### Chat 体验

- 多轮对话持久化（Prisma + SQLite）
- 对话列表侧边栏（新建/重命名/删除/搜索）
- 停止生成 / 重新生成 / Token 统计
- AI 思考过程展示（可折叠）
- 消息复制 / 分享

### Agent 工具调用

- 3 个预定义工具：申请年假、查询报销、查询加班
- 触发词检测 + 用户确认交互
- ToolCallCard 组件（参数预览 + 确认/取消 + 结果展示）

### 评估闭环

- 50 条 HR FAQ 自动评估（准确性/完整性/相关性三维度）
- Judge LLM 复用 qwen2.5 评分
- 评估结果持久化 + 前后端 Dashboard（纯 SVG 雷达图）
- 后台异步处理 + 轮询进度条

### 工程化

- Error Boundary + React.lazy/Suspense + 代码分割
- 45 个 E2E 测试（Playwright）+ 81 个单元测试（Vitest + Jest）
- Spec-Driven 开发流程（spec → instruction → pr）
- 自动 Release PR（feat→minor, fix→patch）
- Project Conventions Skill（可迁移到新项目）

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动 Ollama（需要安装 qwen2.5:7b-instruct）
ollama pull qwen2.5:7b-instruct
ollama serve

# 初始化数据库
cd apps/api && npx prisma db push

# 启动开发服务器
pnpm dev              # 前后端同时启动
# 访问 http://localhost:5173

# 运行测试
pnpm test             # 单元测试
pnpm test:e2e         # E2E 测试

# 运行评估
pnpm eval             # 对 50 条 FAQ 运行 RAG 质量评估
```

## 项目结构

```
├── apps/
│   ├── web/          # React 前端 (Vite + CSS Modules)
│   │   ├── src/      # 组件 / hooks / pages / api
│   │   └── e2e/      # Playwright E2E 测试
│   └── api/          # NestJS 后端
│       ├── src/      # 模块 (ask/auth/chat/rag/eval/tool...)
│       └── prisma/   # 数据库 Schema
├── changes/features/ # Spec-Driven 开发文档
├── .github/workflows/# CI/CD (ci + release + release-pr)
├── .codex/skills/    # Codex Skill
└── knowledge/        # 项目深度文档
```

## 文档导航

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 系统架构
- [PRD.md](./PRD.md) — 产品需求
- [AI-SPEC.md](./AI-SPEC.md) — AI Spec 开发规范
- [DESIGN.md](./DESIGN.md) — 设计文档
- [CONTRIBUTING.md](./CONTRIBUTING.md) — 贡献指南
- [knowledge/](./knowledge/) — 技术深度解析

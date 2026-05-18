# DESIGN.md — HR AI Assistant (RAG)

> 本文档是项目的**唯一事实来源（Single Source of Truth）**。所有 AI 编码行为必须基于本文档及其子文档进行。
>
> 版本：v2.3
> 技术栈：NestJS (TS) + React (TS) + Ollama（本地真实模型）
> 开发模式：Spec-Driven Agentic Development (SDAD)

---

## 1. 项目定位

基于 **RAG (Retrieval-Augmented Generation)** 的企业内部 HR 知识问答系统。让员工通过自然语言查询公司制度、政策和流程，同时作为 **Spec-Driven Agentic Development** 的工程范式实践项目。

---

## 2. 文档体系（Document Hierarchy）

```
项目根目录
├── DESIGN.md              ← 顶层设计（本文档）
├── PRD.md                 ← 产品需求
├── AI-SPEC.md             ← AI能力规范
├── ARCHITECTURE.md        ← 架构决策
├── .cursorrules           ← AI编码规范
├── README.md              ← 项目说明
├── CONTRIBUTING.md        ← Git Workflow + 贡献指南
│
├── changes/               ← 变更级 Spec（按功能域划分）
│   ├── phase-1-infrastructure/
│   ├── phase-2-rag-engine/
│   ├── phase-3-user-experience/
│   └── phase-4-extension/
│
├── specs/                 ← 模块级 Spec（代码直接驱动源）
│   ├── README.md          ← Specs 目录说明与使用指南
│   └── modules/           ← 按模块拆分的 Spec
│       ├── auth-spec.md       ← 登录认证
│       ├── theme-spec.md      ← Theme 主题
│       ├── chat-spec.md       ← Chat 对话
│       ├── api-spec.md        ← 后端 API
│       ├── embedding-spec.md  ← Embedding 向量生成
│       ├── chunk-spec.md      ← 文档分块
│       ├── rag-spec.md        ← RAG 检索引擎
│       ├── document-spec.md   ← 文档管理
│       ├── llm-spec.md        ← LLM 生成
│       ├── vector-spec.md     ← 向量存储
│       └── user-profile-spec.md ← 用户个人数据
│
├── docs/                  ← 项目文档
│   └── hr-documents/      ← HR制度文档（内置+用户上传）
│       ├── 年假制度.md
│       ├── 报销流程.md
│       ├── 晋升规则.md
│       ├── 考勤制度.md
│       └── 员工福利.md
│
├── knowledge/             ← 领域知识沉淀
│   └── index.md
│
├── .claude/               ← Claude Code 工程化配置
│   ├── skills/            ← 项目级 Skills
│   │   ├── frontend-architect/
│   │   ├── rag-engineer/
│   │   ├── spec-driven-dev/
│   │   ├── code-reviewer/
│   │   ├── nestjs-expert/
│   │   └── git-workflow/
│   ├── mcp.json           ← MCP Server 配置模板
│   └── settings.json      ← Claude Code 项目级设置
│
├── .github/               ← GitHub 配置
│   └── pull_request_template.md
│
└── apps/                  ← 应用代码（开发过程中生成）
    ├── api/               ← NestJS 后端
    └── web/               ← React 前端
```

> 新增模块 `specs/modules/user-profile-spec.md`：定义用户个人数据模型与 RAG 注入机制，支持"我有多少天年假"类个人查询。

### 2.1 三层 Spec 架构

| 层级 | 目录 | 作用 | 稳定性 | 变更频率 |
|------|------|------|--------|---------|
| **项目级 Spec**（宪法层）| 根目录 `.md` | 定义全局规则、架构决策、产品需求 | 高 | 低 |
| **变更级 Spec**（法案层）| `changes/` | 按 Phase 划分功能域，定义范围边界和验收标准 | 中 | 中 |
| **模块级 Spec**（执行层）| `specs/modules/` | 代码直接驱动源，包含接口、数据流、状态机、UI 规范 | 中 | 高 |

**更新优先级**：当实现与 Spec 冲突时，从下往上更新：
1. 先更新模块级 Spec（反映具体实现需求）
2. 必要时更新变更级 Spec（反映 Phase 范围变化）
3. 必要时更新项目级 Spec（反映全局规则变化）

---

## 3. 核心设计哲学

### 3.1 Spec 驱动（Spec-Driven）
- 所有业务规则、AI 行为、架构决策必须先在 Spec 中定义，后进入代码
- 代码是 Spec 的**忠实实现**，不是创新发挥
- 当实现与 Spec 冲突时，**优先修改 Spec 以反映真实业务需求**，再让 AI 重构代码

### 3.2 真实模型驱动（Real Model Driven）
- 使用 Ollama 本地真实模型（`qwen2.5:7b-instruct` + `nomic-embed-text`）
- 拒绝 Fake/Mock 数据进入核心链路
- 面试时可现场演示真实推理过程

### 3.3 接口可替换（Pluggable Architecture）
- LLM、Embedding、VectorStore 均为接口/抽象类定义
- 当前实现：Ollama 本地模型 + 内存 VectorStore
- 未来可一键切换：OpenAI / Claude / Chroma / Milvus

### 3.4 范围冻结（Scope Freeze）
以下功能**未经显式授权禁止实现**：
- ❌ 真实数据库（MySQL/PostgreSQL/MongoDB）
- ❌ PDF/Word/Excel 文件上传解析（仅支持 Markdown .md 文件）
- ❌ 多租户/多企业支持
- ❌ 复杂管理后台 Dashboard
- ❌ 单元测试（MVP 阶段以 E2E 可运行为准）
- ❌ 多语言支持
- ❌ 性能监控/埋点系统

---

## 4. 变更管理策略（Change Management）

### 4.1 项目级 Spec（宪法层）
- DESIGN.md / PRD.md / AI-SPEC.md / ARCHITECTURE.md / .cursorrules
- 全局唯一，长期稳定，变更需走"Spec Evolution"流程

### 4.2 变更级 Spec（法案层）
按 **功能域（Feature Domain）** 划分：

| 变更域 | 标识 | 范围 | 复杂度 |
|--------|------|------|--------|
| 技术基建 | `infra` | 项目结构、Ollama 连通、内置文档索引 | 中 |
| AI 核心引擎 | `rag-engine` | 检索、生成、多轮对话、SSE | 高 |
| 用户交互体验 | `ux` | Theme、登录、ChatUI、文档浏览+上传 | 中 |
| 协议扩展 | `extension` | MCP、热门问题、连接状态 | 低 |

### 4.3 文档目录结构
- **项目 Spec**：根目录 `.md` 文件（宪法级，直接可见）
- **变更 Spec**：`changes/` 目录（按 Phase 组织）
- **模块 Spec**：`specs/modules/` 目录（按模块拆分，代码直接驱动源）
- **HR 文档**：`docs/hr-documents/`（内置+上传，运行时加载）
- **知识沉淀**：`knowledge/`（踩坑记录、最佳实践）

### 4.4 模块级 Spec 演进规则

- **模块隔离**：每个模块 Spec 独立演进，不影响其他模块
- **先 Spec 后代码**：任何业务逻辑变更，先更新模块 Spec，再驱动代码
- **接口锁定**：模块间通过接口通信，接口变更需同步更新双方 Spec
- **版本追溯**：每个 Spec 文件底部保留演进记录
- **单一职责**：一个模块 Spec 只关注一个业务领域

---

## 5. Claude Code 工程化配置（.claude/）

### 5.1 Skills（自动加载）

| Skill | 触发场景 |
|-------|---------|
| `frontend-architect` | 前端组件开发、页面实现 |
| `rag-engineer` | RAG 链路开发、检索调优 |
| `spec-driven-dev` | 需求分析、Task 拆分、Spec 演进 |
| `code-reviewer` | 代码审查、重构建议 |
| `nestjs-expert` | 后端模块开发、接口设计 |
| `git-workflow` | Git 操作、分支管理、提交规范 |

### 5.2 MCP Servers

复制 `.claude/mcp.json` 到项目根目录，安装对应 MCP Server 后即可使用。

---

## 6. 版本控制策略（Git Workflow）

### 6.1 分支模型
- **main**：Spec 稳定版本，仅接受来自 develop 的合并
- **develop**：开发主分支，集成各 Phase 的完成代码
- **feature/phase-X**：各变更域的开发分支（如 `feature/phase-1-infra`）

### 6.2 提交规范（Conventional Commits）

| 类型 | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(phase-2): implement RAG orchestration service (Task-004)` |
| `fix` | Bug 修复 | `fix(phase-3): correct Theme toggle state persistence` |
| `docs` | 文档更新 | `docs: update AI-SPEC similarity threshold to 0.45` |
| `refactor` | 重构 | `refactor(phase-1): migrate from Express to NestJS` |
| `chore` | 构建/工具链 | `chore: initialize project with Spec-Driven Development docs` |

### 6.3 提交粒度
- 每个 Task 完成后独立提交
- 提交必须可编译、可运行
- 禁止在 main 分支直接提交代码

### 6.4 Spec 演进与 Git 的关系
- Spec 变更单独提交，标记为 `docs:`
- 代码变更必须对应到某个 Task，提交信息引用 Task 编号
- 详见 `CONTRIBUTING.md`

---

## 7. 关键术语表

| 术语 | 定义 |
|------|------|
| **RAG** | Retrieval-Augmented Generation |
| **AI Spec** | 定义 AI 能力边界、Prompt 规范、幻觉控制策略 |
| **Task** | 可独立执行、可验收的开发单元 |
| **Theme** | UI 主题模式：light / dark / system |
| **Ollama** | 本地 LLM 推理引擎 |
| **MCP** | Model Context Protocol |
| **Skill** | Claude Code 的隐式知识包 |
| **变更域** | 按垂直功能划分的 Spec 单元 |
| **内置文档** | 预置在 `docs/hr-documents/` 的 HR 制度 Markdown |
| **文档上传** | 通过前端上传新的 Markdown 文件，自动解析索引 |

---

## 8. 快速启动

```bash
# 1. 安装 Ollama
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
ollama serve

# 2. 启动项目
pnpm install
pnpm --filter api start:dev
pnpm --filter web dev
```

---

## 9. Spec 演进记录

| 日期 | 版本 | 变更内容 | 变更人 |
|------|------|---------|--------|
| 2026-05-17 | v2.0 | 技术栈升级为 NestJS/TS + Ollama 真实模型 | 梁元 |
| 2026-05-17 | v2.0 | 引入 Spec-Driven Agentic Development Workflow | 梁元 |
| 2026-05-17 | v2.1 | 引入变更级 Spec 分层 | 梁元 |
| 2026-05-17 | v2.2 | 增加内置 HR 文档 + Markdown 上传功能 | 梁元 |
| 2026-05-17 | v2.3 | 增加 `.claude/` Skills/MCP + Git Workflow + 目录重构 | 梁元 |

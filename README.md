# HR AI Assistant — 企业人事智能问答系统

> 基于 RAG (Retrieval-Augmented Generation) 的企业内部 HR 知识问答系统。
> 
> 技术栈：NestJS + React + TypeScript + Ollama（本地真实模型）
> 
> 开发模式：Spec-Driven Agentic Development (SDAD)

---

## ✨ 核心特性

- **真实本地模型**：基于 Ollama 本地运行 `qwen2.5:7b-instruct`（LLM）和 `nomic-embed-text`（Embedding），零费用、可离线演示
- **完整 RAG 链路**：向量检索 + 关键词检索混合，真实 768 维 Embedding，余弦相似度计算
- **多轮对话**：支持上下文关联的连续追问，流式 SSE 输出
- **来源可追溯**：每个回答标注引用文档和相似度分数
- **内置 HR 文档**：预置 5 个制度文档（年假/报销/晋升/考勤/福利），开箱即用
- **文档上传**：支持上传新的 Markdown 文件，自动解析、分块、生成 Embedding 并重建索引
- **Theme 系统**：支持浅色/深色/跟随系统模式
- **简单登录**：预置账号（employee / hr），JWT 鉴权，无数据库依赖
- **MCP 协议**：支持 Model Context Protocol，可作为外部 Agent 的工具调用

---

## 🚀 快速启动

### 环境要求

- Node.js 18+
- Ollama（本地 LLM 推理引擎）
- 8GB+ 显存 或 16GB+ 内存（用于运行 7B 模型）

### 1. 安装 Ollama 并下载模型

```bash
# 安装 Ollama（macOS/Linux）
curl -fsSL https://ollama.com/install.sh | sh

# 或访问 https://ollama.com 下载 Windows/macOS 客户端

# 拉取模型（约 4-8GB）
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text

# 启动 Ollama 服务（默认 http://localhost:11434）
ollama serve
```

### 2. 启动项目

```bash
# 克隆项目
git clone https://github.com/<your-username>/hr-rag-assistant.git
cd hr-rag-assistant

# 安装依赖（使用 pnpm，或 npm/yarn）
pnpm install

# 启动后端（NestJS）
pnpm --filter api start:dev

# 另开一个终端，启动前端（React + Vite）
pnpm --filter web dev

# 访问 http://localhost:5173
```

### 3. 测试账号

| 账号 | 密码 | 角色 |
|------|------|------|
| `employee` | `123456` | 普通员工 |
| `hr` | `123456` | HR 专员 |

---

## 📁 项目结构

```
hr-rag-assistant/
├── .github/                 # GitHub 配置
│   └── pull_request_template.md
│
├── apps/                    # 应用代码
│   ├── api/                 # NestJS 后端
│   └── web/                 # React 前端
│
├── changes/                 # 变更级 Spec（按功能域划分）
│   ├── phase-1-infrastructure/
│   ├── phase-2-rag-engine/
│   ├── phase-3-user-experience/
│   └── phase-4-extension/
│
├── docs/                    # 项目文档
│   └── hr-documents/        # HR 制度文档（内置+用户上传）
│       ├── 年假制度.md
│       ├── 报销流程.md
│       ├── 晋升规则.md
│       ├── 考勤制度.md
│       └── 员工福利.md
│
├── knowledge/               # 领域知识沉淀
│   └── index.md
│
├── .claude/                 # Claude Code 工程化配置
│   ├── skills/              # 项目级 Skills
│   │   ├── frontend-architect/
│   │   ├── rag-engineer/
│   │   ├── spec-driven-dev/
│   │   ├── code-reviewer/
│   │   ├── nestjs-expert/
│   │   └── git-workflow/
│   ├── mcp.json             # MCP Server 配置模板
│   └── settings.json        # Claude Code 项目级设置
│
├── DESIGN.md                # 顶层设计
├── PRD.md                   # 产品需求
├── AI-SPEC.md              # AI 能力规范
├── ARCHITECTURE.md         # 架构决策
├── .cursorrules            # AI 编码规范（含 Git 规范）
├── .gitignore              # Git 忽略文件
├── README.md               # 项目说明
└── CONTRIBUTING.md         # 贡献指南（Git Workflow）
```

---

## 📄 内置文档（初始知识库）

系统预置 5 个 HR 制度文档：

| 文档 | 分类 | 内容 |
|------|------|------|
| `年假制度.md` | 年假 | 年假天数、申请规则、使用规则、请假流程、折算规定 |
| `报销流程.md` | 报销 | 报销时间、发票要求、审批额度、差旅标准、通讯补贴 |
| `晋升规则.md` | 晋升 | 评估时间、考核标准、晋升等级、薪资调整、申请流程 |
| `考勤制度.md` | 考勤 | 工作时间、弹性打卡、迟到处理、请假类型、加班管理 |
| `员工福利.md` | 福利 | 社会保险、补充医疗、节日福利、年度体检、培训发展 |

---

## ⬆️ 文档上传

支持上传新的 **Markdown (.md)** 文件：

1. 进入"文档"页面
2. 点击"上传文档"按钮
3. 选择 `.md` 文件（≤ 1MB）
4. 系统自动解析、分块、生成 Embedding 并重建索引
5. 上传成功后，立即可以针对新文档提问

---

## 🧠 Spec-Driven 开发 Workflow

本项目采用 **Spec-Driven Agentic Development (SDAD)** 模式开发：

1. **项目级 Spec 定义**：在 `PRD.md` / `AI-SPEC.md` / `ARCHITECTURE.md` 中定义全局需求、AI 行为、架构决策
2. **变更级 Spec 拆分**：在 `changes/<phase>/` 中按功能域拆分范围、Task、验收标准
3. **AI 编码**：基于 `.cursorrules` 约束，Claude Code 按 Task 编号逐个实现
4. **Review & Evolve**：验证是否符合 Spec，发现漏洞则更新 Spec 并重构

---

## 🤖 Claude Code 工程化配置（.claude/）

### Skills（自动加载）

| Skill | 触发场景 |
|-------|---------|
| `frontend-architect` | 前端组件开发、页面实现 |
| `rag-engineer` | RAG 链路开发、检索调优 |
| `spec-driven-dev` | 需求分析、Task 拆分、Spec 演进 |
| `code-reviewer` | 代码审查、重构建议 |
| `nestjs-expert` | 后端模块开发、接口设计 |
| `git-workflow` | Git 操作、分支管理、提交规范 |

### MCP Servers（配置模板）

复制 `.claude/mcp.json` 到项目根目录，安装对应 MCP Server 后即可使用：

```bash
# Fetch MCP（获取外部文档）
npx -y @modelcontextprotocol/server-fetch

# Memory MCP（跨会话知识记忆）
npx -y @modelcontextprotocol/server-memory

# GitHub MCP（Git 操作、PR 管理）
npx -y @modelcontextprotocol/server-github

# SQLite MCP（本地数据库，未来扩展）
npx -y @modelcontextprotocol/server-sqlite

# Chroma MCP（向量数据库，未来扩展）
pip install chroma-mcp
```

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Axios |
| 后端 | NestJS 10 + TypeScript |
| LLM | Ollama `qwen2.5:7b-instruct`（本地） |
| Embedding | Ollama `nomic-embed-text`（本地，768维） |
| 向量存储 | In-Memory（接口抽象，可替换 Chroma） |
| 认证 | JWT + 内存用户表 |
| 协议 | MCP (Model Context Protocol) |
| 文件上传 | Multer（仅接受 .md 文件） |

---

## 🔒 安全与隐私

- 所有回答**仅基于**上传的 HR 文档，禁止引用外部知识
- 涉及个人隐私的问题（如"某人的工资"）会被明确拒绝
- 本地运行，文档和对话数据不出境
- 文件上传限制：仅接受 `.md` 文件，单文件 ≤ 1MB

---

## 📜 许可证

MIT

---

> 本项目为 Spec-Driven Agentic Development 的工程实践，旨在探索"基于 AI Spec 的现代研发工程搭建经验"。

# HR AI Assistant — 企业人事智能问答系统

> 基于 RAG (Retrieval-Augmented Generation) 的企业内部 HR 知识问答系统。
>
> 技术栈：NestJS 11 + React 18 + TypeScript + Vite 5 + Ollama（本地真实模型）
>
> 开发模式：Spec-Driven Agentic Development (SDAD)

---

## ✨ 核心特性

- **真实本地模型**：基于 Ollama 本地运行 `qwen2.5:7b-instruct`（LLM）和 `nomic-embed-text`（Embedding），零费用、可离线演示
- **完整 RAG 链路**：向量检索(权重0.4) + 关键词检索(权重0.6) 混合，真实 768 维 Embedding，余弦相似度计算
- **个人数据注入**：识别"我的年假"/"我还有多少报销额度"等个人查询，自动注入当前用户的真实人事数据
- **多轮对话**：支持上下文关联的连续追问，流式 SSE 输出
- **来源可追溯**：每个回答标注引用文档和相似度分数
- **内置 HR 文档**：预置 5 个制度文档（年假/报销/晋升/考勤/福利），开箱即用
- **文档中心**：支持分类筛选、标题搜索、Markdown 预览，HR 可上传新文档自动重建索引
- **个人中心**：展示年假、报销、考勤、福利、培训等 19 个字段的个人数据
- **Theme 系统**：支持浅色/深色/跟随系统模式
- **简单登录**：预置账号（employee / hr），JWT 鉴权（7天过期），无数据库依赖
- **对话持久化**：基于 Prisma + SQLite 的对话和消息持久化，刷新/重启不丢失；左侧对话列表侧边栏（支持新建/重命名/删除/搜索）
- **高级流式 UX**：停止生成、重新生成、Token 计数统计、思考过程展示（可折叠）
- **Agent 工具调用**：3 个预定义工具（申请年假/查询报销/查询加班），触发词检测 + 用户确认交互
- **检索可视化**：点击"查看检索详情"弹出抽屉面板，展示文档相似度条形图、向量 vs 关键词贡献对比、Prompt 预览
- **RAG 评估闭环**：50 条 HR FAQ 自动评估，Judge LLM 三维度评分（准确性/完整性/相关性），纯 SVG 雷达图 Dashboard
- **Error Boundary**：全局错误降级，React.lazy/Suspense 页面级代码分割
- **E2E 测试**：45 个 Playwright 用例覆盖全部核心流程

---

## 🛠 技术栈

| 层级      | 技术                                                                    |
| --------- | ----------------------------------------------------------------------- |
| 前端      | React 18 + TypeScript + Vite 5 + Axios                                  |
| 后端      | NestJS 11 + TypeScript + JWT                                            |
| LLM       | Ollama `qwen2.5:7b-instruct`（本地）                                    |
| Embedding | Ollama `nomic-embed-text`（本地，768维）                                |
| 向量存储  | In-Memory（接口抽象，可替换为 Chroma 等）                               |
| 数据库    | SQLite（Prisma ORM），表：Conversation + Message + EvalRun + EvalResult |
| 测试      | Vitest（前端）+ Jest（后端）+ Playwright（E2E）                         |
| CI/CD     | GitHub Actions（quality + e2e + release-pr + release）                  |
| 认证      | JWT + 内存用户表 + 全局 AuthGuard + RolesGuard                          |
| 文件上传  | Multer（仅接受 .md 文件）                                               |

---

## 📁 项目结构

```
hr-rag-assistant/
├── apps/                          # 应用代码
│   ├── api/                       # NestJS 后端
│   │   ├── src/
│   │   │   ├── app.module.ts      # 根模块（聚合11个子模块）
│   │   │   ├── main.ts            # 入口（CORS + PORT 3000）
│   │   │   ├── ask/               # SSE 问答接口
│   │   │   ├── auth/              # JWT 认证 + 全局 Guard
│   │   │   ├── chat/              # 对话历史管理
│   │   │   ├── document/          # 文档列表/查看/上传
│   │   │   ├── embed/             # Ollama Embedding 服务
│   │   │   ├── health/            # 健康检查
│   │   │   ├── llm/               # Ollama LLM 流式生成
│   │   │   ├── rag/               # RAG 核心编排（混合检索 + 个人数据注入）
│   │   │   ├── user-profile/      # 个人数据查询与 Prompt 格式化
│   │   │   └── vector/            # 内存向量存储
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── nest-cli.json
│   │
│   └── web/                       # React 前端
│       ├── src/
│       │   ├── App.tsx            # 路由配置（4个页面 + 保护路由）
│       │   ├── main.tsx           # 入口（AuthProvider + ThemeProvider）
│       │   ├── api/               # Axios client + SSE streamer
│       │   ├── components/        # 15 个组件（Chat/Document/Layout/Error/Theme）
│       │   ├── context/           # AuthContext + ThemeContext
│       │   ├── hooks/             # useChat
│       │   ├── pages/             # 5 个页面（+ EvaluationDashboard）
│       │   ├── utils/             # Markdown 渲染
│       ├── e2e/                 # Playwright E2E 测试（13 个 spec 文件，45 个测试用例）
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts         # 代理 /api → localhost:3000
│
├── changes/                       # Spec-Driven 开发文档
│   └── features/                 # 按功能划分（11 个 Feature）
│       ├── add-core-unit-tests/
│       ├── add-e2e-playwright-tests/
│       ├── add-thinking-process-display/
│       ├── add-conversation-persistence/
│       ├── add-advanced-streaming-ux/
│       ├── add-tool-use-visualization/
│       ├── add-react-production-patterns/
│       ├── add-rag-retrieval-visualization/
│       ├── add-evaluation-loop/
│       └── add-project-conventions-skill/
│
├── docs/                          # 项目文档
│   └── hr-documents/              # HR 制度文档（内置 + 用户上传）
│       ├── 年假制度.md
│       ├── 报销流程.md
│       ├── 晋升规则.md
│       ├── 考勤制度.md│       └── 员工福利.md
│
├── knowledge/                     # 领域知识沉淀
│   └── index.md
│
├── specs/                         # 模块级 Spec
│   └── modules/
│       ├── api-spec.md
│       ├── auth-spec.md
│       ├── chat-spec.md
│       ├── chunk-spec.md
│       ├── document-spec.md
│       ├── embedding-spec.md
│       ├── llm-spec.md
│       ├── rag-spec.md
│       ├── theme-spec.md
│       ├── user-profile-spec.md
│       └── vector-spec.md
│
├── DESIGN.md                      # 顶层设计
├── PRD.md                         # 产品需求
├── AI-SPEC.md                     # AI 能力规范
├── ARCHITECTURE.md                # 架构决策
├── AI-CODING-GUIDE.md             # AI 编码指南（10个Task）
├── .cursorrules                   # AI 编码规范（ESLint/Prettier/NestJS/React规则）
├── CONTRIBUTING.md                # 贡献指南（Git Workflow）
├── package.json                   # 根包（lint/format脚本）
├── pnpm-workspace.yaml            # pnpm workspace 配置
├── eslint.config.mjs              # ESLint 配置
├── .prettierrc                    # Prettier 配置
└── README.md                      # 本文件
```

---

## 🚀 快速启动

### 环境要求

- Node.js 22.12+
- pnpm 8+（或 npm/yarn）
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

> **排错**：如果 `ollama serve` 提示端口被占用，说明 Ollama 已经在后台运行，无需重复启动。使用 `ollama list` 确认模型已下载。

### 2. 安装依赖

```bash
# 进入项目目录
cd hr-rag-assistant

# 安装所有依赖（自动处理 workspace）
pnpm install
```

### 3. 初始化数据库

```bash
cd apps/api && npx prisma db push
```

### 4. 启动后端

```bash
# 终端 1：启动 NestJS 后端（默认端口 3000）
pnpm --filter api start:dev
```

启动后，后端会自动：

- 加载 5 个内置 HR 文档
- 调用 Ollama 生成 Embedding 并建立向量索引
- 在控制台输出索引摘要（如 `[VectorStore] 已建立 32 条 Embedding 索引`）

### 5. 启动前端

```bash
# 终端 2：启动 React 前端（默认端口 5173）
pnpm --filter web dev
```

访问 http://localhost:5173

### 6. 登录

使用预置账号登录：

| 账号       | 密码     | 角色     | 说明                           |
| ---------- | -------- | -------- | ------------------------------ |
| `employee` | `123456` | 普通员工 | 可对话、查看文档、查看个人中心 |
| `hr`       | `123456` | HR 专员  | 额外拥有文档上传权限           |

---

## 🧪 功能验收指南

### 基础功能

| 步骤 | 操作                       | 预期结果                               |
| ---- | -------------------------- | -------------------------------------- |
| 1    | 访问 `/login`              | 显示登录表单                           |
| 2    | 输入 `employee` / `123456` | 登录成功，自动跳转到 `/chat`           |
| 3    | 未登录访问 `/chat`         | 自动重定向到 `/login`                  |
| 4    | 点击导航栏"💬 对话"        | 进入对话页面，显示欢迎语和输入框       |
| 5    | 点击导航栏"📚 文档"        | 进入文档中心，显示 5 个预置文档卡片    |
| 6    | 点击导航栏"👤 我的"        | 进入个人中心，显示 19 个字段的个人数据 |
| 7    | 点击"退出登录"             | 清除 Token，跳转到登录页               |

### 对话功能

| 步骤 | 操作                               | 预期结果                                                       |
| ---- | ---------------------------------- | -------------------------------------------------------------- |
| 1    | 输入"年假怎么请？"并按 Enter       | 显示流式回答，底部出现"参考来源"卡片（含文档名和相似度）       |
| 2    | 输入"试用期有年假吗？"（连续追问） | 回答考虑上下文，继续引用相关文档                               |
| 3    | 输入"我有多少天年假？"             | 识别为个人查询，回答中融合个人真实数据（如"剩余 3 天"）        |
| 4    | 输入"张三的工资是多少？"           | 触发隐私过滤，返回拒绝话术                                     |
| 5    | 输入"今天天气怎么样？"             | 触发知识边界过滤，返回"根据现有 HR 文档，无法确认该问题的答案" |
| 6    | 点击"新对话"按钮                   | 清空当前对话，开始新会话                                       |
| 7    | 发送长问题（500字以内）            | 正常发送，超出字符限制无法输入                                 |

### 文档中心

| 步骤 | 操作                       | 预期结果                                      |
| ---- | -------------------------- | --------------------------------------------- |
| 1    | 点击文档卡片               | 弹出 Markdown 预览弹窗                        |
| 2    | 在搜索框输入"年假"         | 只显示标题含"年假"的文档                      |
| 3    | 点击分类筛选"报销"         | 只显示报销类文档                              |
| 4    | HR 账号点击"上传文档"      | 上传 .md 文件后自动重建索引，新文档可立即问答 |
| 5    | 员工账号查看"上传文档"按钮 | 不显示上传按钮                                |

### 个人中心

| 步骤 | 操作                                    | 预期结果                                     |
| ---- | --------------------------------------- | -------------------------------------------- |
| 1    | 查看年假统计卡片                        | 显示总天数/已休/剩余，剩余 ≤1 天时标橙色警告 |
| 2    | 查看考勤统计卡片                        | 迟到 ≥3 次标橙色，忘打卡 ≥2 次标红色         |
| 3    | 查看培训预算                            | 余额 ≤500 标橙色警告                         |
| 4    | 切换 employee / hr 账号分别查看个人中心 | 显示各自不同的个人数据（两套预置 Profile）   |

### 主题切换

| 步骤 | 操作                   | 预期结果                         |
| ---- | ---------------------- | -------------------------------- |
| 1    | 点击导航栏主题切换按钮 | 在浅色/深色/跟随系统之间循环切换 |
| 2    | 刷新页面               | 保留上次选择的主题偏好           |

### 对话管理

| 步骤 | 操作                  | 预期结果                   |
| ---- | --------------------- | -------------------------- |
| 1    | 发送一条消息          | 左侧对话列表自动出现新对话 |
| 2    | 双击对话标题          | 可内联编辑对话名称         |
| 3    | 右键/更多菜单删除对话 | 对话从列表消失             |
| 4    | 刷新页面              | 对话列表和历史消息完整保留 |
| 5    | 点击"新对话"按钮      | 创建空白新对话，输入区聚焦 |

### 评估 Dashboard（HR Only）

| 步骤 | 操作                             | 预期结果                           |
| ---- | -------------------------------- | ---------------------------------- |
| 1    | HR 登录，导航栏出现"📊 评估"入口 | 点击跳转到 `/evaluation`           |
| 2    | 点击"运行评估"                   | 显示进度条（N/50），2 秒轮询更新   |
| 3    | 等待评估完成                     | 显示雷达图、来源频次、问题评分列表 |
| 4    | 刷新页面                         | 历史评估结果持久化保留             |

### 工具调用

| 步骤 | 操作                  | 预期结果                        |
| ---- | --------------------- | ------------------------------- |
| 1    | 输入"帮我申请3天年假" | 弹出 ToolCallCard，显示参数预览 |
| 2    | 点击"确认执行"        | 卡片切换为已完成，显示执行结果  |
| 3    | 点击"取消"            | 卡片显示已取消，不继续生成回答  |
| 4    | 输入"我有几天年假"    | 正常 RAG 回答，不触发工具调用   |

### 检索可视化

| 步骤 | 操作                   | 预期结果                         |
| ---- | ---------------------- | -------------------------------- |
| 1    | 发送问题，等待回答完成 | 操作栏出现"查看检索详情"按钮     |
| 2    | 点击按钮               | 右侧滑出抽屉，显示相似度条形图   |
| 3    | 查看检索来源贡献       | 显示向量检索 vs 关键词检索命中数 |
| 4    | 查看检索过程           | 显示 RAG 检索的完整思考过程文本  |
| 5    | 点击遮罩/✕/按 Esc      | 抽屉关闭                         |

---

## 📜 开发脚本

```bash
# 根脚本（一键操作）
pnpm build        # 构建 Web + API（先 Web 后 API）
pnpm start        # 启动生产模式（端口 3000，serve API + 前端）
pnpm preview      # 一键构建 + 启动

# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 测试
pnpm test               # 全部单元测试（81 个用例）
pnpm test:e2e           # E2E 测试（45 个用例）
pnpm eval               # 运行 RAG 质量评估

# 仅格式化检查
pnpm format:check

# 后端（独立）
pnpm --filter api start:dev   # 开发模式（热重载）
pnpm --filter api build       # 构建
pnpm --filter api start:prod  # 生产模式（仅 API）

# 前端（独立）
pnpm --filter web dev         # 开发服务器
pnpm --filter web build       # 构建
pnpm --filter web preview     # 预览生产构建
```

---

## 📦 生产部署与分享

生产模式下，NestJS 后端会自动 serve 前端构建产物，无需额外 Web 服务器。

### 本地构建与预览

```bash
# 一键构建 + 启动
pnpm preview

# 或分步操作
pnpm build     # 先构建（Web → API）
pnpm start     # 再启动（端口 3000）
```

启动后访问 <http://localhost:3000> 即可使用。

### 通过 ngrok 分享给他人

如果想让其他人在线体验：

```bash
# 1. 安装 ngrok（macOS）
brew install ngrok

# 2. 启动项目
pnpm preview

# 3. 另开终端，暴露公网
ngrok http 3000

# 4. 将 ngrok 输出的 URL 分享给对方
#    例如: https://abc123.ngrok-free.app
```

> ngrok 免费版每次重启 URL 会变化，适合临时演示。如需固定域名，可考虑 Cloudflare Tunnel 或部署到云服务器。

### 项目端口说明

| 模式  | 端口    | 说明                    |
| ----- | ------- | ----------------------- |
| 开发  | :5173   | Vite dev server + proxy |
| 开发  | :3000   | NestJS API（热重载）    |
| 生产  | :3000   | NestJS serve API + 前端 |
| ngrok | → :3000 | 公网 URL → 本地 3000    |

---

## 📄 内置文档（初始知识库）

系统预置 5 个 HR 制度文档：

| 文档          | 分类 | 内容                                             |
| ------------- | ---- | ------------------------------------------------ |
| `年假制度.md` | 年假 | 年假天数、申请规则、使用规则、请假流程、折算规定 |
| `报销流程.md` | 报销 | 报销时间、发票要求、审批额度、差旅标准、通讯补贴 |
| `晋升规则.md` | 晋升 | 评估时间、考核标准、晋升等级、薪资调整、申请流程 |
| `考勤制度.md` | 考勤 | 工作时间、弹性打卡、迟到处理、请假类型、加班管理 |
| `员工福利.md` | 福利 | 社会保险、补充医疗、节日福利、年度体检、培训发展 |

---

## ⬆️ 文档上传

支持上传新的 **Markdown (.md)** 文件：

1. 进入"文档"页面
2. 点击"上传文档"按钮（仅 HR 角色可见）
3. 选择 `.md` 文件（≤ 1MB）
4. 系统自动解析、分块、生成 Embedding 并重建索引
5. 上传成功后，立即可以针对新文档提问

---

## 🧠 Spec-Driven 开发 Workflow

本项目采用 **Spec-Driven Agentic Development (SDAD)** 模式开发：

1. **项目级 Spec 定义**：在 `PRD.md` / `AI-SPEC.md` / `ARCHITECTURE.md` / `DESIGN.md` 中定义全局需求、AI 行为、架构决策
2. **变更级 Spec 拆分**：在 `changes/features/<feature-name>/` 中按功能域拆分为三个文档：
   - `spec.md` — 需求规格（背景、技术方案、测试用例、验收标准）
   - `instruction.md` — Agent 执行指令（分阶段 Task、具体代码、验证命令）
   - `pr.md` — PR 描述模板（变更描述、Task 关联、审查重点）
3. **模块级 Spec 细化**：在 `specs/modules/` 中定义每个模块的接口、数据模型、行为约束（共 11 个模块 Spec）
4. **AI 编码**：基于 `.cursorrules` 约束，按 `AI-CODING-GUIDE.md` 的 Task 编号逐个实现
5. **Review & Evolve**：验证是否符合 Spec，发现漏洞则更新 Spec 并重构

---

## 🔒 安全与隐私

- 所有回答**仅基于**上传的 HR 文档，禁止引用外部知识
- 涉及**他人**隐私的问题（如"某人的工资"）会被明确拒绝
- 涉及敏感信息（工资数字、银行卡号、身份证号）即使询问自己也会被拒绝
- 本地运行，文档和对话数据不出境
- 文件上传限制：仅接受 `.md` 文件，单文件 ≤ 1MB

---

## ⚠️ 已知限制

- **对话历史**：已支持对话持久化和侧边栏列表（Prisma + SQLite），但消息最大保留 10 条
- **向量存储**：当前使用内存存储，重启后索引需重新构建（生产环境可替换为 Chroma/Milvus）
- **用户数据**：预置两套内存 Profile，未连接真实 HR 系统

---

## 📜 许可证

MIT

---

> 本项目为 Spec-Driven Agentic Development 的工程实践，旨在探索"基于 AI Spec 的现代研发工程搭建经验"。

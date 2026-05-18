# AI 代码生成执行手册

> 本手册定义如何使用 Claude Code 基于项目 Spec 生成代码的完整流程。
> 适用于：从 0 开始生成 `apps/` 目录下的全部代码。

---

## 前置准备（人工执行）

### 1. 环境检查

```bash
# 确认 Ollama 已安装并运行
ollama --version
ollama list  # 确认 qwen2.5:7b 和 nomic-embed-text 已下载
ollama serve

# 确认 Node.js 版本
node --version  # 需 >= 18

# 确认 pnpm
pnpm --version
```

### 2. Git 分支准备

```bash
cd /Users/work/learn/hr-rag-assistant

# 创建 develop 分支（如不存在）
git checkout -b develop

# 创建 Phase 1 功能分支
git checkout -b feature/phase-1-infrastructure
```

### 3. Claude Code 启动方式

**方式 A：IDE 内 Claude Code GUI**
- 在 IDEA 中打开项目根目录
- 打开 Claude Code 面板（通常右侧或底部）
- 确保 Claude Code 能读取项目根目录下的所有 `.md` 文件

**方式 B：终端 Claude Code CLI**
```bash
cd /Users/work/learn/hr-rag-assistant
claude
```

---

## 执行原则（大厂 Spec-Driven 规范）

### 原则 1：先读 Spec 再写代码
每个 Task 开始前，Claude Code 必须先读取对应的模块 Spec，代码是 Spec 的**忠实实现**。

### 原则 2：接口先行
```
interface → service → controller → frontend
（接口）    →（逻辑） →（路由）   →（UI）
```

### 原则 3：模块隔离
- 禁止跨模块直接引用内部文件
- 跨模块通信通过 Module `imports/exports`

### 原则 4：逐 Task 交付
- 每个 Task 生成后必须**独立可编译**
- 每个 Task 完成后立即 `git commit`
- 禁止累积多个 Task 一次性提交

### 原则 5：Lint 门禁
- 每个 Task 完成后运行 `pnpm lint`，必须 0 error
- 格式问题用 `pnpm format` 自动修复

---

## Phase 1：技术基建（Infrastructure）

**对应 Spec**：
- 变更级：`changes/phase-1-infrastructure/spec.md`
- 模块级：`specs/modules/embedding-spec.md` + `specs/modules/chunk-spec.md` + `specs/modules/vector-spec.md`

### Task-001：初始化 NestJS + React 项目结构

**Claude Code 提示词**：

```
请基于以下 Spec 初始化项目结构：

1. 先读取 `specs/modules/api-spec.md` 了解全局接口规范
2. 读取 `changes/phase-1-infrastructure/spec.md` 了解 Phase 1 范围
3. 读取 `.cursorrules` 了解技术栈约束

任务：
- 创建 `apps/api/` — NestJS 10 + TypeScript 严格模式项目
- 创建 `apps/web/` — React 18 + TypeScript + Vite 5 项目
- 根目录配置 pnpm workspace (`pnpm-workspace.yaml`)
- 根目录配置共享 ESLint 9 flat config (`eslint.config.mjs`)
- 根目录配置 Prettier (`.prettierrc`)
- 根 `package.json` 包含 scripts: lint, format, format:check
- 后端配置 `@` 路径别名指向 `src/`
- 前端配置 `@` 路径别名指向 `src/`

约束：
- 严格 TypeScript (`strict: true`)，禁止 any
- 命名导出，禁止 `export default`
- CSS Modules + CSS Variables，禁止 Tailwind
- 状态管理用 React Context + useReducer，禁止 Redux/Zustand

完成后运行 `pnpm install` 和 `pnpm lint`，确保无 error。

验收标准：
- `cd apps/api && pnpm start:dev` 能启动 NestJS，监听 3000 端口
- `cd apps/web && pnpm dev` 能启动 Vite，显示默认 React 页面
- `pnpm lint` 无 error
```

**Git 提交**：
```bash
git add .
git commit -m "feat(phase-1): initialize NestJS + React project structure (Task-001)

- Setup pnpm workspace with apps/api and apps/web
- Configure TypeScript strict mode
- Add ESLint 9 flat config + Prettier
- Configure @ path aliases for both projects
- Verified: lint passes, both apps start successfully"
```

---

### Task-002：Ollama 客户端（LLM + Embedding）

**Claude Code 提示词**：

```
请基于以下 Spec 实现 Ollama 客户端模块：

1. 先读取 `specs/modules/embedding-spec.md`
2. 读取 `specs/modules/llm-spec.md`
3. 读取 `.cursorrules` 第 1 节（技术栈约束）和第 10 节（常量与配置）

任务：

后端 (`apps/api/src/`)：
1. 创建 `llm/llm.module.ts` + `llm/llm.service.ts`
   - 实现 `ILLMService` 接口
   - 封装 Ollama `/api/generate` 调用
   - 参数：model=qwen2.5:7b, temperature=0.3, stream=true
   - 返回 `AsyncIterable<string>` 流式输出

2. 创建 `embed/embed.module.ts` + `embed/embed.service.ts`
   - 实现 `IEmbeddingService` 接口
   - 封装 Ollama `/api/embeddings` 调用
   - 模型：nomic-embed-text，输出 768 维归一化向量
   - 支持批量 `embedBatch(texts: string[])`

3. 创建 `health/health.controller.ts`
   - `GET /api/health` — 返回服务状态
   - `GET /api/health/ollama` — 检查 Ollama 连通性，返回可用模型列表

4. 配置 `llm.config.ts` 和 `embed.config.ts`
   - Ollama 地址从环境变量读取，默认 `http://localhost:11434`
   - 超时、重试次数等配置集中管理
   - Service 通过依赖注入获取配置，禁止直接访问 process.env

约束：
- 所有 Service 方法必须有 try-catch
- 使用 NestJS Logger，禁止 console.log
- 接口名使用 I 前缀（如 ILLMService）
- 导入顺序：node → third-party → @/ → relative

完成后运行 `pnpm lint`。

验收标准：
- 调用 `nomic-embed-text`，输入"年假怎么请"，返回 768 维向量
- 调用 `qwen2.5:7b`，输入"你好"，返回中文流式回答
- `/api/health/ollama` 返回模型列表
```

**Git 提交**：
```bash
git add .
git commit -m "feat(phase-1): configure Ollama client for LLM and Embedding (Task-002)

- Implement ILLMService with Ollama HTTP client
- Implement IEmbeddingService with nomic-embed-text
- Add health check endpoints for service and Ollama
- Add module-level config files (llm.config.ts, embed.config.ts)
- Verified: embedding returns 768-dim vector, LLM streams Chinese response"
```

---

### Task-003：文档加载 + 分块 + VectorStore

**Claude Code 提示词**：

```
请基于以下 Spec 实现文档处理基础设施：

1. 先读取 `specs/modules/chunk-spec.md`
2. 读取 `specs/modules/vector-spec.md`
3. 读取 `specs/modules/embedding-spec.md`

任务：

后端 (`apps/api/src/`)：

1. 创建 `document/document-loader.service.ts`
   - 读取 `docs/hr-documents/*.md`（注意路径是项目根目录，需 `../../docs/hr-documents/`）
   - 按 `##` 二级标题分块，最大 512 字符，重叠 50 字符
   - 过滤 < 20 字符的片段，每文档最多 10 个 chunk
   - 识别分类（年假/报销/晋升/考勤/福利/自定义）
   - 控制台输出加载进度

2. 创建 `vector/vector-store.service.ts`
   - 实现 `IVectorStore` 接口
   - 内存 Map 存储，768 维向量
   - 余弦相似度计算（归一化后简化为点积）
   - `search()` 返回按相似度排序的 Top-K 结果

3. 创建 `document/document.module.ts`
   - 整合 DocumentLoader 和 DocumentUploadService（预留）

4. 修改 `app.module.ts`
   - 启动时自动调用 DocumentLoader 加载内置文档
   - 调用 EmbeddingService 生成向量
   - 存入 VectorStore
   - 控制台输出："已加载 N 个文档，共 M 个片段，已建立索引"

约束：
- 文件路径操作使用 `path.resolve()` + `path.basename()` 防目录穿越
- 文档元数据必须包含完整来源信息
- 向量维度不匹配时抛出明确错误

完成后运行 `pnpm lint`。

验收标准：
- 启动后端时，控制台显示"已加载 5 个文档，共 XX 个片段，已建立 Embedding 索引"
- 内存 VectorStore 中能通过 ID 查询到向量，维度为 768
- 向量值是 Ollama 返回的真实语义向量（非随机数）
```

**Git 提交**：
```bash
git add .
git commit -m "feat(phase-1): implement document loading, chunking and vector store (Task-003)

- Add DocumentLoader with markdown ## splitting strategy
- Implement InMemoryVectorStore with cosine similarity search
- Auto-load built-in HR documents on app startup
- Generate real embeddings via Ollama nomic-embed-text
- Verified: 5 documents loaded, XX chunks indexed, 768-dim vectors"
```

**Phase 1 完成后合并到 develop**：
```bash
git checkout develop
git merge feature/phase-1-infrastructure
```

---

## Phase 2：AI 核心引擎（RAG Engine）

**对应 Spec**：
- 变更级：`changes/phase-2-rag-engine/spec.md`
- 模块级：`specs/modules/rag-spec.md` + `specs/modules/chat-spec.md`

### Task-004：RAG 编排服务（检索 + 合并）

**Claude Code 提示词**：

```
请基于以下 Spec 实现 RAG 检索引擎：

1. 先读取 `specs/modules/rag-spec.md`
2. 确认 `specs/modules/vector-spec.md` 中 IVectorStore 接口已存在

任务：

后端 (`apps/api/src/rag/`)：

1. 创建 `rag/keyword-search.service.ts`
   - 预定义 30+ 个中文 HR 关键词（年假、报销、晋升、考勤、福利等）
   - 从用户问题中提取匹配词
   - 对文档片段统计词频 + 标题匹配加分
   - 返回 Top-3 关键词检索结果

2. 创建 `rag/rag.service.ts`
   - 核心编排逻辑：`orchestrate(query)`
   - 步骤：
     a. 向量检索（调用 EmbeddingService.embed + VectorStore.search）
     b. 关键词检索（调用 KeywordSearchService）
     c. 合并去重（向量权重 0.4 + 关键词权重 0.6）
     d. 阈值过滤（最高相似度 < 0.5 则直接返回拒绝话术）
   - 所有参数定义为命名常量（VECTOR_TOP_K, SIMILARITY_THRESHOLD 等）

3. 创建 `rag/rag.module.ts`
   - 导出 RAGService

约束：
- 混合检索权重固定：向量 0.4 + 关键词 0.6（不可改）
- 阈值 0.5 是 Spec 锁定值
- 拒绝话术固定："根据现有 HR 文档，无法确认该问题的答案。建议联系 HR 部门获取准确信息。"

完成后运行 `pnpm lint`。

验收标准：
- 输入"年假怎么请"，返回 Top-3 文档片段，最高相似度 > 0.5
- 输入"公司食堂在哪里"，返回空数组（最高相似度 < 0.5）
- 混合检索权重正确验证
```

**Git 提交**：
```bash
git add .
git commit -m "feat(phase-2): implement hybrid retrieval and RAG orchestration (Task-004)

- Add keyword search with 30+ predefined HR keywords
- Implement RAGService: embed → vector search → keyword search → merge
- Hybrid scoring: vector 0.4 + keyword 0.6
- Threshold filtering at 0.5, return rejection if below
- Verified: annual leave query returns Top-3 chunks with similarity > 0.5"
```

---

### Task-005：多轮对话 + LLM 生成服务

**Claude Code 提示词**：

```
请基于以下 Spec 实现对话管理和 LLM 生成：

1. 先读取 `specs/modules/chat-spec.md`
2. 读取 `specs/modules/rag-spec.md` 第 5 章（Prompt 组装）
3. 读取 `AI-SPEC.md` 第 3 章（Prompt 工程规范）

任务：

后端 (`apps/api/src/`)：

1. 创建 `chat/chat.service.ts`
   - 内存对话历史管理（Map<conversationId, Message[]>）
   - 保留最近 5 轮对话（10 条消息）

2. 创建 `chat/conversation-store.service.ts`
   - 内存会话存储
   - 生成 conversationId
   - 获取/清空对话历史

3. 创建 `chat/chat.module.ts`

4. 扩展 `rag/rag.service.ts`
   - 在 `orchestrate()` 中增加 Prompt 组装逻辑：
     a. System Prompt（固定模板，来自 AI-SPEC.md）
     b. 检索到的文档片段（formatChunks）
     c. 对话历史（formatHistory，最近 5 轮）
     d. 当前问题
   - 上下文截断：总 Token 超限时优先压缩历史，保留检索片段

5. 扩展 `llm/llm.service.ts`
   - 接收组装好的完整 Prompt
   - 调用 Ollama `/api/generate` 流式生成
   - temperature=0.3, max_tokens=1024

约束：
- System Prompt 是固定模板，不可创新修改
- 对话历史格式化："员工：xxx\n助手：xxx"
- 来源引用必须在回答中标注

完成后运行 `pnpm lint`。

验收标准：
- 单轮问答：输入"年假怎么请"，返回基于文档的回答 + 来源引用
- 多轮问答：追问"那病假呢？"，能承接上文
- 拒绝场景：输入"张三的工资是多少"，返回拒绝话术
- LLM 配置：Temperature = 0.3，流式输出
```

**Git 提交**：
```bash
git commit -m "feat(phase-2): implement multi-turn conversation and LLM generation (Task-005)

- Add ChatService with in-memory conversation store
- Implement Prompt assembly: System Prompt + chunks + history + question
- Add context truncation strategy (compress history first)
- Integrate LLM streaming via Ollama generate API
- Verified: single-turn QA, multi-turn follow-up, rejection for privacy"
```

---

### Task-006：SSE 流式 API + 前端 Chat

**Claude Code 提示词**：

```
请基于以下 Spec 实现 SSE 流式接口和前端 Chat 页面：

1. 先读取 `specs/modules/chat-spec.md`
2. 读取 `specs/modules/api-spec.md` 第 3.3 节（问答接口）

任务：

后端 (`apps/api/src/`)：

1. 创建 `ask/ask.controller.ts`
   - `POST /api/ask` — SSE 流式接口
   - 设置响应头：`Content-Type: text/event-stream`
   - 数据格式：`data: {"chunk": "...", "done": false}\n\n`
   - 结束包：`data: {"chunk": "", "done": true, "sources": [...]}\n\n`
   - 心跳：每 15 秒发送 `: heartbeat` 注释
   - 监听 `req.on('close')` 取消生成

前端 (`apps/web/src/`)：

2. 创建 `hooks/useChat.ts`
   - SSE 连接管理（fetch + ReadableStream）
   - 消息状态机（sending → streaming → complete/error）
   - sendMessage, retryMessage, clearConversation
   - 对话列表管理（conversations, loadConversation, newConversation）

3. 创建 `pages/ChatPage.tsx`
   - 消息列表（可滚动）
   - 用户消息：蓝色右对齐气泡
   - 助手消息：灰色左对齐气泡，Markdown 渲染
   - 来源引用卡片（文档名 + 相似度）
   - 输入框：Enter 发送，Shift+Enter 换行
   - 生成中显示脉冲动画

4. 创建 `api/sse.ts`
   - SSE 客户端封装
   - AbortController 支持取消生成

约束：
- 前端必须使用 fetch + ReadableStream（原生 EventSource 不支持自定义 header）
- 使用 `requestAnimationFrame` 节流渲染
- 消息列表渲染 key 必须稳定（不能用 index）
- Markdown 渲染使用安全方式（防范 XSS）

完成后运行 `pnpm lint`。

验收标准：
- 前端输入问题，点击发送，首字延迟 < 8 秒
- 回答以打字机效果逐字显示
- 回答结束后显示来源引用卡片
- 支持 Markdown 渲染（列表、加粗、代码块）
- 深色模式下消息气泡对比度舒适
```

**Git 提交**：
```bash
git commit -m "feat(phase-2): implement SSE streaming API and Chat frontend (Task-006)

- Add AskController with SSE /api/ask endpoint
- Add heartbeat and client disconnect handling
- Implement useChat hook with SSE lifecycle management
- Create ChatPage with message bubbles and source citations
- Add markdown rendering with XSS protection
- Verified: streaming works, first token < 8s, sources displayed"
```

**Phase 2 完成后合并到 develop**：
```bash
git checkout develop
git merge feature/phase-2-rag-engine
```

---

## Phase 3：用户交互体验（User Experience）

**对应 Spec**：
- 变更级：`changes/phase-3-user-experience/spec.md`
- 模块级：`specs/modules/auth-spec.md` + `specs/modules/theme-spec.md` + `specs/modules/document-spec.md` + `specs/modules/user-profile-spec.md`

### Task-007：Theme 系统

**Claude Code 提示词**：

```
请基于以下 Spec 实现全局 Theme 系统：

1. 先读取 `specs/modules/theme-spec.md`

任务：

前端 (`apps/web/src/`)：

1. 创建 `styles/variables.css`
   - 定义 `:root` 浅色变量和 `[data-theme="dark"]` 深色变量
   - 包含所有颜色变量（bg-primary, text-primary, accent-color 等）
   - 分类色深色模式适配（年假、报销、晋升、考勤、福利）

2. 创建 `context/ThemeContext.tsx`
   - ThemeMode: 'light' | 'dark' | 'system'
   - 从 localStorage 读取，默认 'system'
   - system 模式监听 `prefers-color-scheme`
   - 应用 theme 到 `document.documentElement`

3. 创建 `components/Theme/ThemeToggle.tsx`
   - 图标按钮，点击展开下拉菜单
   - 选项：浅色 / 深色 / 跟随系统

4. 修改 `index.html`
   - 内联防 FOUC 脚本（在 `<head>` 中）

约束：
- 所有颜色引用 CSS Variables，禁止硬编码
- CSS Modules 样式方案
- 切换即时生效，无闪烁

完成后运行 `pnpm lint`。

验收标准：
- 首次打开跟随系统偏好
- 可切换 light / dark / system
- 刷新后保持上次选择
- 深色模式下所有组件对比度舒适
```

**Git 提交**：
```bash
git commit -m "feat(phase-3): implement Theme system with light/dark/system modes (Task-007)

- Add CSS Variables for light and dark themes
- Create ThemeContext with localStorage persistence
- Create ThemeToggle component with dropdown menu
- Add FOUC prevention inline script in index.html
- Verified: theme switches instantly, persists across refresh"
```

---

### Task-008：登录认证（JWT + 角色）

**Claude Code 提示词**：

```
请基于以下 Spec 实现登录认证系统：

1. 先读取 `specs/modules/auth-spec.md`
2. 读取 `specs/modules/user-profile-spec.md` 第 2 章（预置用户数据）

任务：

后端 (`apps/api/src/auth/`)：

1. 创建 `auth/auth.service.ts`
   - 内存用户表（2 个预置用户：employee/123456, hr/123456）
   - 用户数据包含完整的 UserProfile（来自 user-profile-spec.md）
   - JWT 签发（expiresIn: '7d', HS256）
   - JWT 验证

2. 创建 `auth/auth.controller.ts`
   - `POST /api/auth/login`

3. 创建 `auth/auth.module.ts`
   - 导出 AuthService

4. 创建 `auth/jwt.strategy.ts`
   - Passport JWT 策略

5. 创建 `auth/roles.guard.ts`
   - 角色权限控制

前端 (`apps/web/src/`)：

6. 创建 `context/AuthContext.tsx`
   - 登录状态管理
   - Token 持久化（localStorage: 'hr_rag_token'）
   - 自动跳转（未登录 → /login，已登录 → /chat）

7. 创建 `pages/LoginPage.tsx`
   - 账号/密码输入框
   - 登录按钮
   - 错误提示

8. 创建全局 Axios 拦截器
   - 请求自动附加 `Authorization: Bearer <token>`
   - 401 响应自动清除 Token 并跳转登录页

9. 创建 `components/Layout/Navbar.tsx`
   - 顶部导航栏（Logo + 页面入口 + ThemeToggle + 用户菜单）
   - 页面入口：💬对话 / 📚文档 / 👤我的
   - 用户菜单显示 realName + level

约束：
- 密码当前明文比对（MVP 简化）
- JWT Secret 从环境变量读取，提供默认值
- 禁止在代码中硬编码凭证

完成后运行 `pnpm lint`。

验收标准：
- employee / 123456 登录成功，返回 JWT
- hr / 123456 登录成功
- 错误密码返回 401
- 未登录访问 /chat 自动跳转 /login
- 所有 /api/ask 请求携带 JWT
```

**Git 提交**：
```bash
git commit -m "feat(phase-3): implement JWT auth with role-based access (Task-008)

- Add AuthService with memory user table (2 preset users + profiles)
- Add AuthController POST /api/auth/login
- Add JWT strategy and RolesGuard
- Add AuthContext with localStorage token persistence
- Add LoginPage with form validation
- Add Axios interceptors for auth and 401 handling
- Add Navbar with navigation entries and user menu
- Verified: both users login, 401 redirect works, JWT attached to requests"
```

---

### Task-009：文档中心 + 上传页面

**Claude Code 提示词**：

```
请基于以下 Spec 实现文档中心页面：

1. 先读取 `specs/modules/document-spec.md`
2. 读取 `specs/modules/api-spec.md` 第 3.5 节（文档接口）

任务：

后端 (`apps/api/src/document/`)：

1. 创建 `document/document.controller.ts`
   - `GET /api/documents` — 返回文档列表
   - `GET /api/documents/:id` — 返回单个文档内容
   - `POST /api/documents/upload` — 上传 .md 文件（仅 HR）
     - Multer 接收 multipart
     - 校验：仅 .md，≤ 1MB
     - 保存到 `docs/hr-documents/`
     - 触发重新加载所有文档 → 分块 → Embedding → 重建索引

2. 创建 `document/document-upload.service.ts`
   - 保存文件、触发索引重建

3. 创建 `document/document.module.ts`

前端 (`apps/web/src/`)：

4. 创建 `pages/DocumentPage.tsx`
   - 文档统计头部（总数、片段数）
   - 搜索框（按标题实时过滤）
   - 分类筛选标签（全部、年假、报销等）
   - 文档卡片网格（3/2/1 列响应式）
   - 上传按钮（仅 HR 可见）

5. 创建 `components/Document/DocumentCard.tsx`
   - 分类色背景、标题、片段数、文件大小

6. 创建 `components/Document/DocumentViewer.tsx`
   - Modal/Drawer 展示 Markdown 内容

7. 创建 `components/Document/DocumentUploader.tsx`
   - 点击选择 / 拖拽上传
   - 前端校验 .md + 1MB
   - 上传进度和结果提示

约束：
- 文件路径消毒（path.resolve + path.basename）
- 前端根据 user.role 条件渲染上传按钮
- 深色模式适配

完成后运行 `pnpm lint`。

验收标准：
- 展示 5 个内置文档卡片
- 点击卡片查看 Markdown 详情
- 分类筛选有效
- HR 可上传 .md 文件，上传后自动索引
- 上传非 .md 前端提示错误
- 响应式布局正常
```

**Git 提交**：
```bash
git commit -m "feat(phase-3): implement document center with browse and upload (Task-009)

- Add DocumentController with list, detail, and upload endpoints
- Add DocumentUploadService with reindexing on upload
- Add DocumentPage with search, category filter, and grid layout
- Add DocumentCard, DocumentViewer, DocumentUploader components
- Frontend validation for .md files and size limit
- Role-based upload button visibility
- Verified: 5 built-in docs displayed, upload triggers reindex"
```

---

## 扩展 Task：Profile 页面 + UserProfile 模块

**对应 Spec**：`specs/modules/user-profile-spec.md`

### Task-010：用户个人数据服务 + Profile 页面

**Claude Code 提示词**：

```
请基于以下 Spec 实现用户个人数据模块和 Profile 页面：

1. 先读取 `specs/modules/user-profile-spec.md`
2. 确认 `specs/modules/auth-spec.md` 中 User 模型已包含 profile 字段

任务：

后端 (`apps/api/src/user-profile/`)：

1. 创建 `user-profile/user-profile.service.ts`
   - `getProfile(userId)` — 返回 UserProfile
   - `isPersonalQuery(query)` — 判断是否为个人查询
   - `formatForPrompt(profile)` — 格式化为 Prompt 文本
   - `getAllUsers()` — 返回所有预置用户

2. 创建 `user-profile/user-profile.module.ts`
   - 导出 UserProfileService

3. 创建 `user-profile/user-profile.controller.ts`
   - `GET /api/me` — 返回当前登录用户的完整信息（含 profile）

4. 修改 `rag/rag.service.ts`
   - 在 `orchestrate()` 中注入个人数据逻辑：
     a. 调用 `isPersonalQuery()` 判断
     b. 如为个人查询，调用 `formatForPrompt()` 获取文本
     c. 插入到 System Prompt 的 `{{user_profile}}` 位置

5. 修改 `auth/auth.service.ts`
   - 确保预置用户携带完整的 UserProfile 数据

前端 (`apps/web/src/`)：

6. 创建 `pages/ProfilePage.tsx`
   - ProfileHeader：头像、姓名、职级、部门、入职日期
   - StatCard 网格：年假、报销、考勤、福利
   - 请假记录汇总、补贴明细
   - 数据颜色警示（如年假 ≤1 天变橙色）
   - 响应式：4/2/1 列

7. 修改 `App.tsx`（或路由配置）
   - 添加 `/profile` 路由

约束：
- 个人数据注入仅在 `isPersonalQuery()` 返回 true 时执行
- 工资等敏感问题仍拒绝回答
- 用户只能看自己的数据

完成后运行 `pnpm lint`。

验收标准：
- `GET /api/me` 返回完整 profile
- employee 问"我还有多少天年假" → "你还有 3 天年假剩余"
- 问"年假怎么请"（非个人）→ 不注入个人数据
- 问"我的工资是多少" → 拒绝回答
- Profile 页面正确展示所有统计卡片
```

**Git 提交**：
```bash
git commit -m "feat(phase-3): implement UserProfile module and Profile page (Task-010)

- Add UserProfileService with personal query detection and prompt formatting
- Add GET /api/me endpoint returning full user profile
- Integrate personal data injection into RAG pipeline
- Add ProfilePage with StatCards for leave, reimbursement, attendance, welfare
- Add responsive grid layout and warning color states
- Verified: personal queries answered with profile data, privacy questions rejected"
```

---

## 验证与收尾

### 端到端验证清单

```bash
# 1. 启动 Ollama
ollama serve

# 2. 启动后端
cd apps/api && pnpm start:dev

# 3. 启动前端（新终端）
cd apps/web && pnpm dev

# 4. 访问 http://localhost:5173
# 5. 使用 employee / 123456 登录
# 6. 测试对话："年假怎么请" → 应返回带来源引用的回答
# 7. 测试个人查询："我还有多少天年假" → "你还有 3 天"
# 8. 测试拒绝："张三的工资是多少" → 拒绝话术
# 9. 访问 /documents → 应看到 5 个文档卡片
# 10. 访问 /profile → 应看到个人统计
# 11. 切换 Theme → 应即时生效
```

### 最终合并

```bash
# 完成所有 Task 后
git checkout develop
git merge feature/phase-3-user-experience

# 可选：合并到 main
git checkout main
git merge develop
```

---

## 常见问题

### Q: Claude Code 生成的代码不符合 Spec 怎么办？
**A**: 不要直接改代码。先更新 Spec 反映真实需求，再给 Claude Code 提示词："请根据更新后的 `specs/modules/xxx-spec.md` 重新实现 `apps/...`"

### Q: 一个 Task 太大，AI 生成不完整？
**A**: 拆分为 sub-task，提交信息标注 `Task-004-part1`、`Task-004-part2`，但每个 part 必须可编译。

### Q: 需要修改已完成的模块？
**A**: 
1. 更新对应模块 Spec
2. `git commit -m "docs: update xxx-spec ..."`
3. 让 AI 基于新 Spec 重构
4. `git commit -m "feat/refactor: ..."`

### Q: lint 报错怎么办？
**A**: 先运行 `pnpm format` 自动修复格式问题。剩余 error 让 AI 修复："请修复以下 lint error：..."

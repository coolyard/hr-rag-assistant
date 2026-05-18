# ARCHITECTURE.md — 架构设计与技术决策

> 本文档回答"怎么搭"和"为什么这么搭"。所有代码实现必须符合本文档的模块划分和接口定义。

---

## 1. 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React 18 + TypeScript + Vite                                │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  ChatPage   │  │ DocumentPage│  │   LoginPage         │  │
│  │             │  │  + Upload   │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         └────────────────┴────────────────────┘              │
│                    ThemeProvider (light/dark/system)          │
│                         │                                    │
│                   AuthContext (JWT + 角色)                   │
│                         │                                    │
│                   useChat Hook (SSE + 状态管理)               │
│                         │                                    │
│                    apiClient (Axios)                         │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTP / SSE
┌─────────────────────────┼──────────────────────────────────┐
│                      Backend                                │
│  NestJS 10 + TypeScript                                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    API Gateway                          │ │
│  │  AuthGuard (JWT)  │  ThrottleGuard  │  CORS           │ │
│  └────────────────────────────────────────────────────────┘ │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────┐           │
│  │              Controllers (Routers)            │           │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────────┐    │           │
│  │  │ Auth    │ │ Ask      │ │ Documents   │    │           │
│  │  │Controller│ │Controller│ │ Controller  │    │           │
│  │  └────┬────┘ └────┬─────┘ └──────┬──────┘    │           │
│  └───────┼──────────┼──────────────┼───────────┘           │
│          └──────────┴──────────────┘                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Services (Business Logic)                │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │ │
│  │  │ RAG      │ │ LLM      │ │ Embed    │ │ Auth    │  │ │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service │  │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘  │ │
│  │       └────────────┴────────────┘            │       │ │
│  │              │                               │       │ │
│  │  ┌───────────┴───────────┐  ┌──────────────┴────┐  │ │
│  │  │    VectorStore        │  │  ConversationStore │  │ │
│  │  │    (Interface)        │  │  (In-Memory)       │  │ │
│  │  └─────────────────────┘  └─────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Document Module                          │ │
│  │  DocumentLoader  │  DocumentUploadService  │  Indexer │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              MCP Module (Extension)                   │ │
│  │  MCPServer  │  ToolRegistry  │  SchemaValidator      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │  Ollama   │
                    │ localhost │
                    │ :11434    │
                    └───────────┘
                          │
                    ┌─────┴─────┐
                    │ docs/hr-documents/*.md │
                    └───────────┘
```

---

## 2. 技术栈

| 层级 | 技术选型 | 版本/说明 | 备选方案 |
|------|---------|----------|---------|
| 前端框架 | React | 18.x | Vue / Svelte |
| 前端语言 | TypeScript | 严格模式 | — |
| 构建工具 | Vite | 5.x | Webpack |
| 样式方案 | CSS Modules + CSS Variables | Theme 动态切换 | Tailwind / Styled Components |
| 状态管理 | React Context + useReducer | 足够当前复杂度 | Zustand / Redux |
| HTTP 客户端 | Axios | 支持 SSE | Fetch API |
| 后端框架 | NestJS | 10.x | Express / Fastify |
| 后端语言 | TypeScript | 严格模式 | — |
| 运行环境 | Node.js | 18+ | — |
| LLM 推理 | Ollama HTTP API | 本地 `qwen2.5:7b` | OpenAI / Claude |
| Embedding | Ollama HTTP API | 本地 `nomic-embed-text` | OpenAI Embedding |
| 向量存储 | In-Memory Dict | 接口抽象，未来可换 Chroma | Chroma / Milvus |
| 认证 | JWT (jsonwebtoken) | 内存用户表 | OAuth / SSO |
| 文档解析 | 原生 fs + Markdown | 按标题分块 | PDF Parser |
| 文件上传 | Multer (multipart) | 仅接受 .md 文件 | — |

---

## 3. 架构决策记录（ADR）

### ADR-001: 为什么用 NestJS 而非 Express？
- **背景**：项目需要模块化、依赖注入、可测试性，且目标岗位（米哈游）明确要求 NestJS
- **决策**：采用 NestJS + TypeScript
- **代价**：学习曲线略陡，但模块化利于团队协作和长期维护
- **状态**：已接受

### ADR-002: 为什么用 Ollama 本地模型而非云端 API？
- **背景**：Demo 场景需要零注册、零费用、可离线演示；隐私性好
- **决策**：Ollama 本地部署 `qwen2.5:7b` + `nomic-embed-text`
- **代价**：需要 8GB+ 显存或 16GB+ 内存；首次下载模型耗时
- **状态**：已接受
- **扩展点**：LLM 和 Embedding 均通过接口抽象，未来可一键切换云端 API

### ADR-003: 为什么向量存储用内存而非 Chroma？
- **背景**：当前 HR 文档量级约 50-100 个片段，内存完全够用
- **决策**：In-Memory VectorStore（基于 Map 的 768 维向量存储）
- **代价**：重启后需重新索引；并发量受限
- **状态**：已接受
- **扩展点**：已实现 `IVectorStore` 接口，切换 Chroma 只需实现同一接口

### ADR-004: 为什么登录用 Fake/Memory 而非数据库？
- **背景**：MVP 范围冻结，不引入数据库依赖；仅需区分员工/HR 两种角色
- **决策**：内存预置 2 个用户（employee / hr），JWT 鉴权，LocalStorage 持久化 Token
- **代价**：无法动态增删用户；重启后端丢失会话
- **状态**：已接受

### ADR-005: 为什么自研 RAG Pipeline 而非 LangChain？
- **背景**：需要精细控制检索阈值、Prompt 模板、混合检索权重；LangChain 抽象过高，调试困难
- **决策**：自研 Pipeline，模块化设计，接口可替换
- **代价**：开发成本略高，但可控性极强，且能深入理解底层原理
- **状态**：已接受

### ADR-006: 为什么引入 Theme 系统？
- **背景**：HR 文档通常较长，员工可能在不同光线环境下使用；体现前端工程细节关注
- **决策**：实现 light / dark / system 三种模式，通过 CSS Variables 动态切换
- **范围控制**：不做多套主题（如企业蓝、节日红），只做模式切换
- **状态**：已接受

### ADR-007: 为什么采用变更级 Spec 分层？
- **背景**：参考阿里云淘特团队"融合策略"和渐进式框架"复杂度分层"理念
- **决策**：按功能域（Feature Domain）划分变更级 Spec，每个域包含前后端全链路
- **状态**：已接受

### ADR-008: 为什么支持 Markdown 文件上传？
- **背景**：用户需要扩展知识库，上传新的 HR 制度文档；但 PDF/Word 解析复杂，超出 MVP 范围
- **决策**：支持 `.md` 文件上传，上传后自动保存到 `docs/hr-documents/`，触发分块和 Embedding 索引重建
- **状态**：已接受
- **约束**：仅接受 `.md` 扩展名，单文件 ≤ 1MB

### ADR-009: 为什么 HR 文档放在 docs/hr-documents/ 而非 apps/api/docs/？
- **背景**：HR 文档是项目的知识库，不仅是后端运行时需要的资源，也是项目的核心资产
- **决策**：将 HR 文档放在项目根目录的 `docs/hr-documents/`，与代码目录分离，更清晰
- **代价**：后端代码加载路径需要调整为 `../../docs/hr-documents/`
- **状态**：已接受

---

## 4. 模块边界与接口定义

### 4.1 后端模块（NestJS Modules）

```typescript
interface IVectorStore {
  add(id: string, embedding: number[], metadata: DocumentMeta): void;
  search(queryEmbedding: number[], topK: number): SearchResult[];
  clear(): void;
}

interface ILLMService {
  generate(prompt: string, history: Message[], options?: GenerateOptions): AsyncIterable<string>;
}

interface IEmbeddingService {
  embed(text: string): Promise<number[]>;
}

interface IAuthService {
  validateUser(username: string, password: string): Promise<User | null>;
  login(user: User): Promise<{ access_token: string }>;
  verify(token: string): Promise<UserPayload>;
}

interface IDocumentUploadService {
  upload(file: Express.Multer.File): Promise<{ filename: string; chunks: number }>;
  reindex(): Promise<{ totalDocuments: number; totalChunks: number }>;
}
```

### 4.2 模块依赖关系

```
AppModule
├── AuthModule
│   ├── AuthService (implements IAuthService)
│   ├── AuthController
│   └── JwtStrategy
├── RAGModule
│   ├── RAGService (编排：Embed → Retrieve → LLM)
│   ├── AskController
│   ├── LLMService (implements ILLMService) → 调用 Ollama
│   ├── EmbeddingService (implements IEmbeddingService) → 调用 Ollama
│   └── VectorStore (implements IVectorStore) → 内存实现
├── DocumentModule
│   ├── DocumentService
│   ├── DocumentController
│   ├── DocumentLoader (启动时加载 docs/hr-documents/*.md)
│   └── DocumentUploadService (implements IDocumentUploadService)
├── MCPModule
│   ├── MCPServer
│   ├── MCPController
│   └── ToolRegistry
└── ChatModule
    ├── ChatService (对话历史管理)
    └── ConversationStore (内存实现)
```

---

## 5. 前后端模块映射

| 前端模块 | 后端模块 | 接口契约 |
|---------|---------|---------|
| LoginPage.tsx | AuthController + AuthService | POST /api/auth/login → {access_token} |
| ThemeContext.tsx | （无，纯前端） | localStorage 持久化 |
| ChatPage.tsx + useChat.ts | AskController + RAGService | SSE /api/ask |
| DocumentPage.tsx | DocumentController | GET /api/documents |
| DocumentUploader.tsx | DocumentController + DocumentUploadService | POST /api/documents/upload (multipart) |

---

## 6. 数据流

### 6.1 问答请求流

```
用户输入问题
    │
    ▼
前端 useChat → apiClient.post('/api/ask', {question, conversationId})
    │
    ▼
NestJS AskController → AuthGuard(JWT) 验证
    │
    ▼
RAGService.orchestrate()
    ├── EmbeddingService.embed(question) → Ollama /api/embeddings
    ├── VectorStore.search(embedding) → 内存余弦相似度计算
    ├── KeywordSearch.search(question) → 预定义关键词匹配
    ├── Merge & Deduplicate → Top-3 片段
    ├── Build Prompt（System Prompt + 历史 + 检索片段）
    └── LLMService.generate(prompt) → Ollama /api/generate (stream)
    │
    ▼
SSE 流式返回 → 前端逐字渲染
    │
    ▼
前端显示：回答文本 + SourceCitation（来源片段 + 相似度）
```

### 6.2 文档上传流

```
用户点击上传按钮，选择 .md 文件
    │
    ▼
前端 DocumentUploader → POST /api/documents/upload (multipart/form-data)
    │
    ▼
NestJS DocumentController → AuthGuard(JWT) 验证 + 文件类型检查（仅 .md）
    │
    ▼
DocumentUploadService.upload(file)
    ├── 保存文件到 docs/hr-documents/
    ├── 调用 DocumentLoader 解析 Markdown
    ├── 调用 EmbeddingService 生成 768 维向量
    ├── 调用 VectorStore.add() 存入内存索引
    └── 返回 { filename, chunks, status: 'indexed' }
    │
    ▼
前端提示"上传成功，已建立索引"
    │
    ▼
用户立即可以针对新文档提问
```

---

## 7. API 规格

### 7.1 端点列表

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/health` | 健康检查 | — | `{status, timestamp, service, version}` |
| POST | `/api/auth/login` | 用户登录 | `{username, password}` | `{access_token}` |
| POST | `/api/ask` | RAG 问答 | `AskRequest` | SSE `AskResponse` |
| GET | `/api/documents` | 列出所有文档 | — | `{documents, total}` |
| GET | `/api/documents/:id` | 获取单个文档 | — | `Document` |
| POST | `/api/documents/upload` | 上传 Markdown 文档 | multipart/form-data | `{filename, chunks, status}` |
| GET | `/api/ask/history/:id` | 获取对话历史 | — | `{history, conversationId}` |
| DELETE | `/api/ask/history/:id` | 清空对话历史 | — | `{success}` |

### 7.2 文档上传接口详情

**POST /api/documents/upload**

请求：
```http
Content-Type: multipart/form-data

file: <.md 文件>
```

响应（成功）：
```json
{
  "filename": "新员工入职指南.md",
  "chunks": 8,
  "status": "indexed",
  "message": "上传成功，已建立索引"
}
```

约束：
- 仅接受 `.md` 扩展名
- 单文件大小 ≤ 1MB
- 保存路径：`docs/hr-documents/`

---

## 8. 错误处理策略

| 层级 | 错误类型 | 处理方式 |
|------|---------|---------|
| Ollama 未启动 | 连接拒绝 | 返回 503，前端提示"本地模型服务未连接" |
| 检索无结果 | 相似度均 < 0.5 | 返回拒绝话术，不进入 LLM |
| LLM 生成超时 | 流式中断 | SSE 发送 `{"done": true, "error": "生成超时"}` |
| JWT 失效 | 401 | 前端拦截 401，自动跳转登录页 |
| 未授权访问 | 403 | 返回 `{"error": "权限不足"}` |
| 文件类型错误 | 400 | 返回 `{"error": "仅支持 .md 文件"}` |
| 文件过大 | 413 | 返回 `{"error": "文件大小超过 1MB 限制"}` |
| 未知异常 | 500 | NestJS 全局 ExceptionFilter 捕获 |

---

## 9. 扩展点

| 扩展点 | 当前实现 | 未来演进 |
|--------|---------|---------|
| LLM | Ollama `qwen2.5:7b` | 接口切换 OpenAI / Claude / 通义千问 |
| Embedding | Ollama `nomic-embed-text` | 接口切换 OpenAI Embedding / BGE |
| VectorStore | In-Memory Map | 实现 IVectorStore 接口接入 Chroma / Milvus |
| Auth | Memory JWT | 接入 OAuth / SSO / LDAP |
| Document | Markdown 文件 + 上传 | 接入 PDF/Word 解析 + 数据库持久化 |
| MCP | 基础 Tool Registry | 支持更多工具类型 + Agent 编排 |

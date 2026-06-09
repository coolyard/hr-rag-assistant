# HR RAG Assistant — 全栈技术深度解析与学习指南

> 本文档基于项目真实代码、全部 21 个 Spec 文件、10 个 AI 生成 Task 和完整 Git 提交历史编写。
> 目标：帮助你从零到一彻底理解这个项目所用到的每一项技术，以及面试官可能追问的每一个深入问题。

---

## 目录

1. [项目概览：你构建了一个什么系统](#一项目概览你构建了一个什么系统)
2. [Spec-Driven 开发方法论](#二spec-driven-开发方法论)
3. [技术栈全景图与每项技术的深入讲解](#三技术栈全景图与每项技术的深入讲解)
4. [架构设计：为什么这样搭](#四架构设计为什么这样搭)
5. [后端核心模块逐层拆解](#五后端核心模块逐层拆解)
6. [前端核心模块逐层拆解](#六前端核心模块逐层拆解)
7. [RAG 链路全流程深度解析](#七rag-链路全流程深度解析)
8. [面试官视角：深入问题与回答策略](#八面试官视角深入问题与回答策略)
9. [学习路径建议](#九学习路径建议)

---

## 一、项目概览：你构建了一个什么系统

### 1.1 一句话定义

**HR RAG Assistant** 是一个基于 **RAG（检索增强生成）** 的企业内部 HR 知识问答系统。员工可以用自然语言提问（如"年假怎么请？"），系统从预置的 HR 制度文档中检索相关知识，结合大语言模型生成准确、可追溯来源的回答。

### 1.2 核心能力矩阵

| 能力维度         | 具体实现                   | 技术亮点                                                |
| ---------------- | -------------------------- | ------------------------------------------------------- |
| **智能问答**     | 自然语言 → 检索 → LLM 生成 | 混合检索（向量 0.4 + 关键词 0.6）、四层幻觉防御         |
| **个人数据查询** | "我还有多少天年假？"       | 正则识别个人查询 → 注入用户 Profile → 数据+制度双源回答 |
| **多轮对话**     | 上下文关联的连续追问       | 内存对话历史（最近 5 轮）、SSE 流式输出                 |
| **来源追溯**     | 每个回答标注引用文档       | SourceCitation 卡片（文档名 + 相似度）                  |
| **文档管理**     | HR 可上传新制度文档        | 自动分块 → Embedding → 索引重建                         |
| **角色权限**     | 员工 / HR 两种角色         | JWT + RolesGuard，上传功能仅限 HR                       |
| **主题切换**     | 浅色 / 深色 / 跟随系统     | CSS Variables + localStorage 持久化                     |

### 1.3 技术栈总览

```
┌─────────────────────────────────────────────────────────────┐
│  前端层：React 18 + TypeScript + Vite 5 + CSS Modules       │
│  状态管理：React Context + useReducer（无 Redux）            │
│  HTTP：Axios + fetch（SSE 场景）                             │
├─────────────────────────────────────────────────────────────┤
│  后端层：NestJS 11 + TypeScript 严格模式                     │
│  认证：JWT (jsonwebtoken) + 内存用户表 + 全局 Guard           │
│  文件上传：Multer（仅 .md）                                  │
├─────────────────────────────────────────────────────────────┤
│  AI 层：Ollama 本地部署                                      │
│  LLM：qwen2.5:7b-instruct（生成回答）                        │
│  Embedding：nomic-embed-text（768维语义向量）                │
│  向量存储：In-Memory Map（余弦相似度搜索）                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、Spec-Driven 开发方法论

### 2.1 什么是 Spec-Driven Development？

Spec-Driven Development（SDD）是一种**先写规范、后写代码**的工程方法。在本项目中，它演化为 **Spec-Driven Agentic Development (SDAD)** —— 不仅人写 Spec，AI 也基于 Spec 生成代码。

### 2.2 三层 Spec 体系

本项目建立了完整的**三层 Spec 体系**，这是你最需要理解的核心方法论：

```
┌────────────────────────────────────────┐
│  第一层：项目级 Spec（全局共识）          │
│  PRD.md → 做什么、不做什么               │
│  DESIGN.md → 顶层设计                    │
│  ARCHITECTURE.md → 怎么搭、为什么这样搭  │
│  AI-SPEC.md → AI 行为约束                │
│  .cursorrules → 代码规范（AI 编码纪律）  │
├────────────────────────────────────────┤
│  第二层：变更级 Spec（功能域拆分）        │
│  changes/phase-1-infrastructure/spec.md  │
│  changes/phase-2-rag-engine/spec.md      │
│  changes/phase-3-user-experience/spec.md │
│  changes/phase-4-extension/spec.md       │
├────────────────────────────────────────┤
│  第三层：模块级 Spec（接口契约）          │
│  specs/modules/rag-spec.md               │
│  specs/modules/chunk-spec.md             │
│  specs/modules/embedding-spec.md         │
│  specs/modules/vector-spec.md            │
│  specs/modules/auth-spec.md              │
│  specs/modules/chat-spec.md              │
│  specs/modules/document-spec.md          │
│  specs/modules/theme-spec.md             │
│  specs/modules/user-profile-spec.md      │
│  specs/modules/api-spec.md               │
│  specs/modules/llm-spec.md               │
└────────────────────────────────────────┘
```

#### 为什么要分三层？

**项目级 Spec** 解决"做什么"的问题。比如 PRD 明确定义：

- ✅ 支持自然语言问答
- ❌ 不做真实用户注册
- ❌ 不连接数据库

**变更级 Spec** 解决"按什么节奏做"的问题。四个 Phase 分别对应：

1. **Phase 1（基建）**：搭框架、连 Ollama、建向量索引
2. **Phase 2（引擎）**：实现 RAG 检索、多轮对话、SSE 流式
3. **Phase 3（体验）**：登录、主题、文档中心、个人中心
4. **Phase 4（扩展）**：MCP、热门问题、连接状态

**模块级 Spec** 解决"接口怎么设计"的问题。每个模块的 Spec 包含：

- 范围边界（包含什么、不包含什么）
- 接口定义（TypeScript Interface）
- 算法伪代码
- 错误处理策略
- 验收标准

### 2.3 AI-CODING-GUIDE：10 个 Task 的生成逻辑

`AI-CODING-GUIDE.md` 是这个项目的**代码生成剧本**，定义了 Claude Code 如何基于 Spec 生成代码。总共 10 个 Task，分为 3 个 Phase：

```
Phase 1（基建）
├── Task-001: 初始化 NestJS + React 项目结构
├── Task-002: Ollama 客户端（LLM + Embedding）
└── Task-003: 文档加载 + 分块 + VectorStore

Phase 2（引擎）
├── Task-004: RAG 编排服务（检索 + 合并）
├── Task-005: 多轮对话 + LLM 生成服务
└── Task-006: SSE 流式 API + 前端 Chat

Phase 3（体验）
├── Task-007: Theme 系统
├── Task-008: 登录认证（JWT + 角色）
├── Task-009: 文档中心 + 上传页面
└── Task-010: 用户个人数据服务 + Profile 页面
```

**每个 Task 的生成原则**（这是大厂级规范）：

1. **先读 Spec 再写代码** —— 代码是 Spec 的忠实实现
2. **接口先行** —— `interface → service → controller → frontend`
3. **模块隔离** —— 禁止跨模块直接引用内部文件
4. **逐 Task 交付** —— 每个 Task 独立可编译，完成后立即 `git commit`
5. **Lint 门禁** —— 每个 Task 完成后运行 `pnpm lint`，必须 0 error

> 💡 **关键认知**：你不是在"让 AI 写代码"，而是在"用 Spec 指挥 AI 写代码"。Spec 是人和 AI 之间的**单一事实来源（Single Source of Truth）**。当代码和 Spec 不一致时，优先更新 Spec，然后让 AI 基于新 Spec 重构。

---

## 三、技术栈全景图与每项技术的深入讲解

### 3.1 NestJS —— 为什么选它而不是 Express？

#### 核心概念

NestJS 是一个**渐进式 Node.js 框架**，基于 TypeScript 构建，核心设计理念是：

1. **模块化（Module）**：每个功能域封装为一个 `@Module()`，内部包含 providers、controllers、imports、exports
2. **依赖注入（DI）**：通过构造函数自动注入依赖，无需手动 `new`
3. **装饰器（Decorator）**：`@Controller()`、`@Get()`、`@Injectable()` 等，声明式编程
4. **AOP（面向切面编程）**：Guard、Interceptor、Pipe、Filter 等可复用的横切逻辑

#### 本项目中的 NestJS 实践

```typescript
// AppModule —— 根模块，聚合所有子模块
@Module({
  imports: [
    AskModule,
    AuthModule,
    ChatModule,
    DocumentModule,
    EmbeddingModule,
    HealthModule,
    LLMModule,
    RagModule,
    UserProfileModule,
    VectorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// AuthModule —— 全局模块，所有路由共享 JWT 配置
@Global()
@Module({
  imports: [JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '7d' } })],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard }, // 全局认证守卫
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

**关键设计**：`AuthModule` 标记为 `@Global()`，并注册 `APP_GUARD`，这意味着**所有 Controller 的每个路由**默认都需要 JWT 认证。只有标记了 `@Public()` 的装饰器才能跳过认证。

#### 与 Express 的对比

| 维度     | Express              | NestJS                        |
| -------- | -------------------- | ----------------------------- |
| 架构风格 | 自由式，无约束       | 模块化 + DI，强制分层         |
| 中间件   | `app.use()` 全局注册 | Guard/Interceptor 精准控制    |
| 类型安全 | 弱，需手动定义       | TypeScript 严格模式，接口驱动 |
| 可测试性 | 差，依赖难 Mock      | DI 容器自动注入，易 Mock      |
| 学习成本 | 低                   | 中高（但长期收益大）          |
| 适用场景 | 小型 API、原型       | 中大型项目、团队协作          |

> 🎯 **面试考点**：如果被问到"为什么用 NestJS"，核心回答是：
>
> 1. **模块化**使代码边界清晰，适合团队协作
> 2. **依赖注入**天然支持可测试性，Mock 替换只需改 Module 配置
> 3. **装饰器**使路由定义声明化，代码可读性高
> 4. 本项目有 11 个模块，Express 的自由风格会导致代码迅速失控

### 3.2 React 18 + Vite —— 前端工程化

#### Vite 的核心优势

Vite 是**下一代前端构建工具**，核心原理：

1. **开发阶段**：利用浏览器原生 ESM（ES Modules），无需打包，启动速度极快
2. **生产阶段**：使用 Rollup 打包，生成高度优化的静态资源
3. **HMR（热模块替换）**：模块级更新，毫秒级响应

```typescript
// vite.config.ts —— 项目配置
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }, // 路径别名
  },
  server: {
    proxy: { '/api': 'http://localhost:3000' }, // 开发代理
  },
});
```

#### 为什么用 Vite 而不是 Webpack？

| 维度       | Webpack                | Vite                   |
| ---------- | ---------------------- | ---------------------- |
| 启动速度   | 慢（需打包整个应用）   | 极快（原生 ESM）       |
| HMR 速度   | 中（重编译受影响模块） | 极快（仅更新变更模块） |
| 配置复杂度 | 高                     | 低                     |
| 生态兼容性 | 极好                   | 好（主流框架均支持）   |
| 生产构建   | 自研优化               | 基于 Rollup，输出更小  |

#### React 18 的并发特性（本项目虽未深度使用，但需了解）

React 18 引入了 **Concurrent Rendering（并发渲染）**：

- `useTransition`：标记非紧急更新，避免阻塞用户输入
- `useDeferredValue`：延迟某些状态的更新优先级
- **Automatic Batching**：多个状态更新自动合并为一次渲染

在本项目中，`useChat` Hook 使用了 `requestAnimationFrame` 来节流 SSE 消息渲染，这是性能优化的一种实践：

```typescript
// useChat.ts 中的节流渲染
const flushTokens = () => {
  const batch = pendingTokens.join('');
  pendingTokens = [];
  accumulated += batch;
  setMessages((prev) =>
    prev.map((m) =>
      m.id === assistantMsg.id ? { ...m, content: accumulated, status: 'streaming' } : m,
    ),
  );
  rafId = null;
};

// 收到 token 时
if (rafId === null) {
  rafId = requestAnimationFrame(flushTokens);
}
```

> 🎯 **面试考点**：`requestAnimationFrame` 在这里的作用是什么？
>
> - SSE 推送频率可能很高（每秒几十次），如果每次收到 token 都立即 `setState`，会导致 React 频繁重渲染
> - `requestAnimationFrame` 将多次 token 累积到**下一次浏览器重绘前**一次性更新，减少渲染次数
> - 这是"节流（Throttle）"策略的一种实现，与 `setTimeout` 节流相比，更贴合浏览器的渲染节奏

### 3.3 Ollama —— 本地 LLM 推理引擎

#### Ollama 是什么？

Ollama 是一个**本地大模型运行环境**，让你在个人电脑上运行开源 LLM（如 Llama、Qwen、DeepSeek 等），无需云端 API Key。

核心架构：

```
Ollama 服务（常驻进程，监听 localhost:11434）
    ├── Model Library（模型仓库，~/.ollama/models/）
    ├── LLM Runtime（llama.cpp 等推理后端）
    └── HTTP API（REST 接口，供外部调用）
```

#### 本项目调用的 Ollama API

```
POST /api/embeddings     → 文本 → 向量（nomic-embed-text）
POST /api/generate       → Prompt → 流式文本（qwen2.5:7b-instruct）
GET  /api/tags           → 列出已下载模型
```

#### nomic-embed-text 的特点

- **模型大小**：约 130MB，轻量级
- **输出维度**：768 维浮点向量
- **上下文长度**：2048 tokens
- **多语言支持**：支持中文、英文等
- **归一化**：输出向量已归一化（L2 范数 ≈ 1.0）

> 💡 **为什么归一化很重要？**
> 归一化后的向量，**余弦相似度 = 点积**。这意味着相似度计算从 `dot / (|a| * |b|)` 简化为 `dot(a, b)`，计算效率翻倍。

### 3.4 JWT 认证 —— 无状态登录

#### JWT 的核心原理

JWT（JSON Web Token）是一种**无状态认证机制**，服务器不保存会话信息，所有认证信息都在 Token 中。

```
JWT 结构：header.payload.signature

header: { alg: "HS256", typ: "JWT" }           → Base64Url 编码
payload: { sub: "user-1", username: "employee", role: "employee", exp: 171... }
                                              → Base64Url 编码
signature: HMACSHA256(header + "." + payload, secret)  → 防篡改签名
```

#### 本项目的 JWT 流程

```
用户输入账号密码
    │
    ▼
AuthService.validateUser() —— 内存表比对
    │
    ▼
JwtService.sign(payload) —— 签发 Token（7天过期）
    │
    ▼
前端存储到 localStorage（key: hr_rag_token）
    │
    ▼
每次请求：Axios 拦截器自动附加 Authorization: Bearer <token>
    │
    ▼
AuthGuard —— 验证 Token 签名和过期时间
    │
    ▼
通过 → 执行 Controller 方法
拒绝 → 401 Unauthorized → 前端清除 Token 并跳转登录页
```

#### 为什么用 JWT 而不是 Session？

| 维度     | Session                    | JWT                       |
| -------- | -------------------------- | ------------------------- |
| 状态     | 有状态（服务端存 Session） | 无状态（信息在 Token 中） |
| 扩展性   | 差（需共享 Session 存储）  | 好（任意服务可独立验证）  |
| 性能     | 每次查询数据库/缓存        | 仅需计算签名              |
| 安全性   | 可主动失效（删 Session）   | 无法主动失效（等过期）    |
| 适用场景 | 需要随时踢人下线           | API 服务、微服务架构      |

> 🎯 **面试考点**："JWT 被盗怎么办？"
>
> - 短期方案：设置短过期时间（本项目 7 天可缩短到 1 小时）+ Refresh Token 机制
> - 中期方案：黑名单（Redis 存储已注销的 Token ID）
> - 长期方案：结合 OAuth 2.0 / OpenID Connect

### 3.5 SSE（Server-Sent Events）—— 为什么选它而不是 WebSocket？

#### SSE 与 WebSocket 的对比

| 维度     | SSE                           | WebSocket             |
| -------- | ----------------------------- | --------------------- |
| 通信方向 | 单向：服务器 → 客户端         | 双向：服务器 ↔ 客户端 |
| 协议基础 | HTTP（兼容性好）              | 独立的 ws:// 协议     |
| 自动重连 | 浏览器原生支持                | 需手动实现            |
| 心跳机制 | 需手动发送注释                | 需手动实现            |
| 适用场景 | 直播流、股票行情、AI 流式回答 | 即时通讯、在线游戏    |

#### 本项目的 SSE 实现

```
后端（NestJS）
    │
    ├── 设置响应头：Content-Type: text/event-stream
    ├── 设置 Cache-Control: no-cache
    ├── 每 15 秒发送 : heartbeat（注释，保持连接）
    └── 数据格式：data: {"chunk": "...", "done": false}\n\n

前端（fetch + ReadableStream）
    │
    ├── fetch('/api/ask', { method: 'POST', body: JSON.stringify(request) })
    ├── response.body.getReader() —— 获取流读取器
    ├── 逐块读取 → TextDecoder 解码
    └── 按 \n\n 分割 → 解析 data: 后的 JSON
```

**关键代码**（前端 SSE 解析）：

```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

for (;;) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const parts = buffer.split('\n\n');
  buffer = parts.pop() ?? '';

  for (const part of parts) {
    const lines = part.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const json = line.slice(6);
        yield JSON.parse(json) as AskStreamChunk;
      }
    }
  }
}
```

> 🎯 **面试考点**："为什么不用原生 EventSource？"
>
> - 原生 `EventSource` **不支持自定义请求头**（如 `Authorization: Bearer <token>`）
> - 原生 `EventSource` 只支持 `GET` 方法，不支持 `POST` 发送问题内容
> - 因此本项目使用 `fetch + ReadableStream` 手动实现 SSE 客户端

### 3.6 CSS Modules + CSS Variables —— 主题系统的工程化实现

#### CSS Modules 的核心价值

CSS Modules 通过**哈希化类名**实现样式局部作用域，避免全局命名冲突：

```css
/* Navbar.module.css */
.navbar {
  background: var(--bg-primary);
}
```

编译后变为：

```css
.Navbar_navbar__3x7a9 {
  background: var(--bg-primary);
}
```

#### CSS Variables 主题切换原理

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  --accent-color: #2563eb;
}

[data-theme='dark'] {
  --bg-primary: #0f172a;
  --text-primary: #e2e8f0;
  --accent-color: #60a5fa;
}
```

切换主题只需改变 `document.documentElement` 的 `data-theme` 属性：

```typescript
document.documentElement.setAttribute('data-theme', 'dark');
```

所有引用 CSS Variables 的组件会**即时响应**，无需重新渲染 React 组件树。

> 🎯 **面试考点**："为什么不用 Tailwind 的 darkMode？"
>
> - Tailwind 的 `darkMode: 'class'` 需要在 HTML 根元素添加 `class="dark"`，原理类似
> - 但 Tailwind 的类名是**原子化的**（如 `bg-white dark:bg-gray-900`），在 HR 文档这种需要大量自定义样式的场景下，代码可读性差
> - CSS Variables 使**语义化命名**（如 `--bg-primary`）和**运行时动态计算**（如 `rgba(var(--accent-rgb), 0.1)`）成为可能

---

## 四、架构设计：为什么这样搭

### 4.1 架构决策记录（ADR）深度解读

`ARCHITECTURE.md` 中记录了 9 个架构决策，这是**系统设计面试**的核心素材。你需要理解每个决策的背景、权衡和扩展点。

#### ADR-002：为什么用 Ollama 本地模型？

**背景**：Demo 场景需要零注册、零费用、可离线演示；企业内部 HR 文档涉密，不适合上传云端。

**决策**：Ollama 本地部署 `qwen2.5:7b-instruct` + `nomic-embed-text`

**权衡**：

- ✅ 零 API 费用、隐私安全、可离线演示
- ❌ 需要 8GB+ 显存或 16GB+ 内存；首次下载模型耗时；推理速度比云端慢

**扩展点**：LLM 和 Embedding 均通过接口抽象，未来可一键切换云端 API：

```typescript
// 当前
class LLMService implements ILLMService {
  async *generate(prompt: string): AsyncIterable<string> {
    // 调用 Ollama /api/generate
  }
}

// 未来扩展：只需新增一个实现类
class OpenAILLMService implements ILLMService {
  async *generate(prompt: string): AsyncIterable<string> {
    // 调用 OpenAI /v1/chat/completions
  }
}
```

#### ADR-003：为什么向量存储用内存？

**背景**：当前 HR 文档量级约 50-100 个片段，内存完全够用（每个向量 768 × 4 字节 ≈ 3KB，100 个向量 ≈ 300KB）。

**决策**：In-Memory VectorStore（基于 Map 的 768 维向量存储）

**权衡**：

- ✅ 实现简单、查询极快（全量遍历 < 1ms）、无外部依赖
- ❌ 重启后需重新索引；并发量受限；无法持久化

**扩展点**：已实现 `IVectorStore` 接口，切换 Chroma 只需实现同一接口：

```typescript
interface IVectorStore {
  add(id: string, embedding: number[], metadata: DocumentMeta): void;
  search(queryEmbedding: number[], topK: number): SearchResult[];
  get(id: string): { embedding: number[]; metadata: DocumentMeta } | undefined;
  getAll(): Array<{ id: string; embedding: number[]; metadata: DocumentMeta }>;
  clear(): void;
  count(): number;
}
```

#### ADR-005：为什么自研 RAG Pipeline 而非 LangChain？

**背景**：需要精细控制检索阈值、Prompt 模板、混合检索权重；LangChain 抽象过高，调试困难。

**决策**：自研 Pipeline，模块化设计，接口可替换

**权衡**：

- ✅ 完全可控、深度理解每个环节、面试时有话说
- ❌ 开发成本略高（但学习收益大）

> 🎯 **面试考点**："LangChain 和自研 RAG 怎么选？"
>
> - **原型阶段 / 快速验证**：LangChain（快速搭建，生态丰富）
> - **生产环境 / 需要精细控制**：自研（可控性强，性能可优化，无黑盒）
> - 本项目目标是学习和面试，自研能让你深入理解 RAG 的每个环节

### 4.2 模块依赖关系

```
AppModule
├── AuthModule (@Global) ── 所有模块共享 JWT
│   ├── AuthService
│   ├── AuthController (POST /api/auth/login)
│   └── MeController (GET /api/me)
│
├── AskModule
│   ├── AskController (POST /api/ask — SSE)
│   └── 依赖 RAGModule
│
├── RagModule
│   ├── RAGService（核心编排）
│   ├── 依赖 EmbeddingModule（问题向量化）
│   ├── 依赖 VectorModule（向量检索）
│   ├── 依赖 LLMModule（生成回答）
│   ├── 依赖 ChatModule（对话历史）
│   └── 依赖 UserProfileModule（个人数据注入）
│
├── DocumentModule
│   ├── DocumentController (GET/POST /api/documents)
│   ├── DocumentLoader（启动时加载内置文档）
│   └── DocumentUploadService（上传后重建索引）
│
└── HealthModule
    └── HealthController (GET /api/health)
```

---

## 五、后端核心模块逐层拆解

### 5.1 文档分块模块（DocumentLoader）

#### 分块策略详解

分块（Chunking）是 RAG 系统的**第一道关卡**，分块质量直接决定检索准确性。

**本项目分块参数**（来自 `chunk-spec.md`）：

| 参数                 | 值                    | 设计依据                                          |
| -------------------- | --------------------- | ------------------------------------------------- |
| `split_by`           | `h2`（Markdown `##`） | HR 文档天然按章节组织，`##` 对应独立主题          |
| `max_chunk_size`     | 512 字符              | 平衡语义完整性和 Embedding 效果（过长会稀释语义） |
| `overlap`            | 50 字符               | 保证跨 chunk 的上下文连续性，避免关键信息被切断   |
| `min_chunk_size`     | 20 字符               | 过滤无意义的短片段（如标题行、空行）              |
| `max_chunks_per_doc` | 10                    | 防止单文档过度占据检索结果                        |

#### 分块算法伪代码

```typescript
function splitDocument(content: string, metadata: DocumentMeta): DocumentChunk[] {
  // Step 1: 按 ## 切分
  const sections = content.split(/^##\s+/m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n');
    const heading = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();

    // Step 2: 超长 section 进一步滑动窗口切分
    const subChunks = splitBySize(body, 512, 50);

    for (let j = 0; j < subChunks.length; j++) {
      const chunkContent =
        j === 0
          ? `## ${heading}\n${subChunks[j]}` // 第一个保留标题
          : subChunks[j];

      chunks.push({ id, content: chunkContent, heading, ...metadata });
    }
  }

  return chunks.filter((c) => c.charCount >= 20).slice(0, 10);
}
```

> 🎯 **面试考点**："分块粒度怎么选？太细和太粗分别有什么问题？"
>
> - **太细（如按句子切分）**：语义不完整，检索时可能匹配到无关片段；LLM 缺乏上下文
> - **太粗（如按整篇文档）**：Embedding 会稀释关键语义，检索精度下降；LLM 上下文可能溢出
> - **本项目的选择**：按 `##` 切分是因为 HR 文档天然按主题章节组织，每章内部语义一致
> - **进阶方案**：语义切分（Semantic Chunking）—— 用 Embedding 相似度判断哪里该切分，保持每块语义连贯

### 5.2 向量存储模块（VectorStoreService）

#### 余弦相似度的数学原理

余弦相似度衡量两个向量在**方向上的相似程度**，与长度无关：

```
cos(θ) = (A · B) / (|A| × |B|)

其中：
- A · B = Σ(Ai × Bi)       → 点积
- |A| = √(Σ(Ai²))          → L2 范数
- |B| = √(Σ(Bi²))          → L2 范数
```

**为什么理解归一化很重要？**

如果 A 和 B 都是**单位向量**（已归一化，|A| = |B| = 1）：

```
cos(θ) = (A · B) / (1 × 1) = A · B
```

这意味着：归一化后的向量，**点积 = 余弦相似度**。nomic-embed-text 输出已归一化的向量，因此理论上点积即余弦相似度。实际代码中仍计算完整的余弦相似度（含模长），以保持对未归一化向量的兼容性。

#### 本项目的实现

```typescript
@Injectable()
export class VectorStoreService implements IVectorStore {
  private readonly vectors = new Map<string, { embedding: number[]; metadata: DocumentMeta }>();

  search(queryEmbedding: number[], topK: number): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [id, data] of this.vectors) {
      const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
      results.push({ chunkId: id, similarity, ...data.metadata });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}
```

> 🎯 **面试考点**："如果数据量增长到 10 万条，内存向量存储还能用吗？"
>
> - 10 万 × 768 × 4 字节 ≈ 307MB 内存，单机仍可承受
> - 但全量遍历的时间复杂度是 O(N)，10 万条需要遍历 10 万次点积计算
> - **生产方案**：使用 ANN（近似最近邻）算法：
>   - **HNSW**（Hierarchical Navigable Small World）：图索引，查询复杂度 O(log N)
>   - **FAISS**（Facebook AI Similarity Search）：PQ（乘积量化）压缩向量
>   - **Chroma / Milvus / Pinecone**：托管向量数据库，内置 HNSW

### 5.3 RAG 编排服务（RAGService）—— 系统心脏

`RAGService.orchestrate()` 是整个系统的**核心编排方法**，实现了完整的检索增强生成链路。让我们逐行解析：

```typescript
async *orchestrate(
  query: string,
  conversationId?: string,
  userId?: string,
): AsyncIterable<StreamChunk> {

  // ========== Step 1: 获取或创建对话 ==========
  const conv = this.chatService.getOrCreateConversation(conversationId);
  this.chatService.addUserMessage(conv.id, query);

  // ========== Step 2: 混合检索 ==========
  const vectorResults = await this.vectorSearch(query, VECTOR_TOP_K);     // Top-3
  const allChunks = this.vectorStore.getAll();
  const keywordResults = this.keywordSearch.search(query, allChunks, KEYWORD_TOP_K);  // Top-3
  const merged = this.mergeResults(vectorResults, keywordResults, MERGE_TOP_K);       // Top-3

  // ========== Step 3: 阈值过滤（Layer 1 幻觉防御）==========
  if (this.shouldReject(merged, query)) {
    this.chatService.addAssistantMessage(conv.id, REJECTION_PHRASE);
    yield { token: REJECTION_PHRASE, done: true, confidenceLevel: 'low' };
    return;
  }

  // ========== Step 4: 个人数据注入 ==========
  let userProfileText = '（未提供）';
  if (userId && this.userProfileService.isPersonalQuery(query)) {
    const profile = this.userProfileService.getProfile(userId);
    if (profile) userProfileText = this.userProfileService.formatForPrompt(profile);
  }

  // ========== Step 5: 组装 Prompt ==========
  const history = this.chatService.getHistory(conv.id);
  const prompt = this.buildPrompt(query, merged, history, userProfileText);

  // ========== Step 6: LLM 流式生成 ==========
  let fullAnswer = '';
  for await (const token of this.llmService.generate(prompt)) {
    fullAnswer += token;
    yield { token, done: false };
  }

  // ========== Step 7: 保存并返回来源 ==========
  const sources = this.buildSources(merged);
  this.chatService.addAssistantMessage(conv.id, fullAnswer, sources);
  yield { token: '', done: true, sources, confidenceLevel: this.getConfidenceLevel(merged[0].hybridScore) };
}
```

#### 混合检索算法详解

**向量检索（语义匹配）**：

- 将用户问题转化为 768 维向量
- 与所有文档 chunk 的向量计算余弦相似度
- 返回 Top-3 最相似的 chunk
- **优点**：理解语义，如"请假"和"休假"语义相近
- **缺点**：对专有名词、编号等精确匹配能力弱

**关键词检索（精确匹配）**：

- 预定义 46 个 HR 关键词（年假、报销、晋升等）
- 从问题中提取匹配的关键词
- 对每个 chunk 从三个维度计分：
  - 标题匹配：+3 分（权重最高，标题是内容的高度概括）
  - 内容词频：每个匹配词出现次数累加
  - 分类匹配：+2 分（文档分类与关键词匹配）
- 归一化到 [0, 1] 区间，返回 Top-3
- **优点**：对精确术语匹配能力强
- **缺点**：无法理解语义变体

**加权线性合并**：

```typescript
// 向量权重 0.4 + 关键词权重 0.6
const VECTOR_WEIGHT = 0.4;
const KEYWORD_WEIGHT = 0.6;

function mergeResults(vectorResults, keywordResults, topK) {
  const merged = new Map();

  // 向量结果加权
  for (const r of vectorResults) {
    merged.set(r.chunkId, { ...r, hybridScore: r.normalizedScore * 0.4, sources: ['vector'] });
  }

  // 关键词结果加权，已存在则叠加
  for (const r of keywordResults) {
    const existing = merged.get(r.chunkId);
    if (existing) {
      existing.hybridScore += r.normalizedScore * 0.6;
      existing.sources.push('keyword');
    } else {
      merged.set(r.chunkId, { ...r, hybridScore: r.normalizedScore * 0.6, sources: ['keyword'] });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, topK);
}
```

> 🎯 **面试考点**："混合检索权重 0.4 + 0.6 是怎么确定的？"
>
> - **依据**：关键词检索在本场景（HR 制度文档）中更可靠，因为：
>   1. 文档术语固定（"年假"、"报销"等关键词明确）
>   2. 用户问题通常包含这些术语
>   3. 向量检索可能因语义相近而引入噪声（如"假期"匹配到"请假"但制度不同）
> - **调优方法**：准备 20 个标注好的测试问题，分别调整权重，计算准确率和召回率，选择最优组合

#### System Prompt 设计详解

以下是本项目的**实际 System Prompt 模板**（来自 `rag.service.ts:24-46`）：

```markdown
你是企业 HR 助手，专门回答员工关于公司制度、政策和流程的问题。

## 核心规则

1. 【知识边界】你只能基于以下检索到的 HR 文档片段和当前用户个人信息回答问题
2. 【准确性优先】如果文档片段和个人信息都无法完整回答问题，必须明确告知无法确认
3. 【来源引用】如果回答引用了文档内容，必须标注来源文档名称
4. 【隐私保护】涉及他人隐私的问题，拒绝回答并提示联系 HR
5. 【个人数据】如果提供了用户个人信息，用户询问自己的数据时优先基于个人数据回答
6. 【语气】使用中文，语气专业、简洁、友好

## 检索到的文档片段

{{retrieved_chunks}}

## 当前用户个人信息

{{user_profile}}

## 对话历史

{{conversation_history}}

## 当前问题

{{user_question}}
```

**Prompt 设计要点**：

| 设计要素       | 具体做法                            | 目的                           |
| -------------- | ----------------------------------- | ------------------------------ |
| 角色定义       | "你是企业 HR 助手"                  | 设定行为边界和语气基调         |
| 规则优先级     | 6 条规则按重要性排列                | 让 LLM 按优先级遵循约束        |
| 动态占位符     | `{{retrieved_chunks}}` 等 4 个      | 模板与数据分离，便于调试和优化 |
| 知识边界       | 规则 #1 明确"只能基于检索片段"      | 这是幻觉防御的 Layer 2         |
| Token 预算管理 | 估计总 token > 28000 时逐步压缩历史 | 防止超过模型上下文窗口         |

> 🎯 **面试考点**："System Prompt 中的规则顺序重要吗？"
>
> - **非常重要**。LLM 对 Prompt 开头和结尾的指令更敏感（"首因效应"和"近因效应"）
> - 最关键的两条规则——"知识边界"和"准确性优先"——放在最前面
> - 这是 Prompt Engineering 中的 **"指令优先（Priming）"** 技术

#### 追问生成机制

`RAGService` 在生成主回答后，会额外调用一次 LLM 生成 3 个追问建议（`rag.service.ts:329-351`）：

```typescript
private async generateFollowUps(query: string, answer: string): Promise<string[]> {
  const prompt = `用户刚问了 HR 相关问题："${query}"，AI 回答："${answer.slice(0, 500)}"
请根据上下文推测用户接下来可能想问的 3 个相关问题...`;

  // 调用 LLM 生成追问 → 按行分割 → 过滤 → 取前 3 个
}
```

**设计意图**：

- 降低用户输入成本（点击追问代替打字）
- 引导用户发现更多可问的制度维度
- 展示 LLM 的多轮调用模式（不是一次调用就结束）

> 🎯 **面试考点**："为什么用两次 LLM 调用而不是一次同时生成回答和追问？"
>
> - 主回答和追问是**不同性质的任务**：主回答基于检索片段，追问基于回答内容推测
> - 分开调用可以在追问失败时不影响主回答
> - 这是 LLM 编排中的 **"关注点分离（Separation of Concerns）"** 原则

#### 四层幻觉防御

| 层级    | 名称               | 机制                                     | 实现位置                 |
| ------- | ------------------ | ---------------------------------------- | ------------------------ |
| Layer 1 | 检索阈值过滤       | hybridScore < 0.5 直接拒绝，不调用 LLM   | RAGService.orchestrate() |
| Layer 2 | System Prompt 约束 | "只能基于检索片段回答" + Temperature=0.3 | LLMService.generate()    |
| Layer 3 | 回答后校验         | 检查回答中的数字是否出现在检索片段中     | 可前端或后端实现         |
| Layer 4 | 置信度标签         | 高(>0.8) / 中(0.5-0.8) / 低(<0.5)        | 前端展示                 |

> 🎯 **面试考点**："为什么需要四层防御？单层不够吗？"
>
> - **单层的问题**：
>   - 仅 Layer 1：LLM 仍可能"编造"检索片段中没有的信息
>   - 仅 Layer 2：Prompt 约束不是 100% 可靠，模型可能"不听话"
>   - 仅 Layer 3：后校验只能发现明显问题，无法发现语义层面的幻觉
> - **多层防御的价值**：每层解决不同层面的问题，形成**纵深防御（Defense in Depth）**

### 5.4 个人数据注入机制

这是本项目的**差异化亮点**，也是面试官最可能深挖的功能。

#### 实现流程

```
用户输入"我还有多少天年假？"
    │
    ▼
isPersonalQuery() —— 正则规则判断
    ├── 第一人称匹配：/我|我的|本人/
    ├── HR 关键词匹配：/年假|报销|考勤|福利/
    └── 数量询问匹配：/还剩|还有|用了|剩余/
    │
    ▼
判断为个人查询 → getProfile(userId) → 获取当前用户的 Profile
    │
    ▼
formatForPrompt(profile) → 格式化为 Prompt 文本
    │
    ▼
插入到 System Prompt 的 {{user_profile}} 占位符位置
    │
    ▼
LLM 同时看到：检索片段 + 个人数据 → 生成融合回答
```

#### Prompt 中的个人数据格式

```markdown
## 当前用户个人信息

以下是你（李明，技术研发部 前端开发工程师，职级 P5）的当前人事数据：

### 年假与请假

- 年假总天数：5 天
- 已休年假：2 天
- 剩余年假：3 天
  ...

### 报销与补贴

...
```

#### 隐私边界设计

| 查询类型                 | 处理方式            | 示例                 |
| ------------------------ | ------------------- | -------------------- |
| 自己的年假/报销/考勤     | ✅ 注入个人数据回答 | "我还有多少天年假？" |
| 自己的工资/银行卡/身份证 | ❌ 拒绝回答         | "我的工资是多少？"   |
| 他人的任何信息           | ❌ 拒绝回答         | "张三的工资是多少？" |
| 通用制度问题             | ✅ 不注入个人数据   | "年假怎么请？"       |

> 🎯 **面试考点**："个人数据注入的实现机制是什么？如何保证安全？"
>
> - **机制**：通过正则规则识别个人查询，仅在识别成功时注入当前登录用户的数据
> - **安全保证**：
>   1. 数据注入发生在后端，前端无法篡改
>   2. 只能查询自己的数据（通过 JWT 中的 userId 关联）
>   3. 敏感字段（工资、银行卡、身份证）即使在个人查询中也被拒绝
>   4. 内存存储，无数据库泄露风险

### 5.5 JWT 认证与权限控制

#### AuthGuard 的工作原理

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Step 1: 检查是否有 @Public() 装饰器
    const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Step 2: 从请求头提取 Token
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader) throw new UnauthorizedException();

    // Step 3: 验证 Token
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const payload = this.jwtService.verify(token);
    request.user = payload;
    return true;
  }
}
```

#### RolesGuard 的工作原理

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Step 1: 检查是否有 @Roles() 装饰器
    const requiredRoles = this.reflector.getAllAndOverride(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Step 2: 检查用户角色
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserPayload;
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN' });
    }
    return true;
  }
}
```

**使用方式**：

```typescript
@Controller('api/documents')
export class DocumentController {
  @Post('upload')
  @UseGuards(RolesGuard) // 先过 RolesGuard
  @Roles('hr') // 要求 hr 角色
  async upload(@UploadedFile() file: Express.Multer.File) {
    // 只有 HR 能执行到这里
  }
}
```

> 🎯 **面试考点**："Guard 的执行顺序是什么？"
>
> - NestJS 中 Guard 的执行顺序是**从左到右**：`@UseGuards(AuthGuard, RolesGuard)` → 先 AuthGuard，后 RolesGuard
> - 本项目通过 `APP_GUARD` 注册全局 AuthGuard，所以所有路由默认先过 AuthGuard
> - RolesGuard 通过 `@UseGuards(RolesGuard)` 显式附加到特定路由

### 5.6 生产部署架构 —— 单进程全栈服务

本项目实现了**零配置单命令部署**，NestJS 同时承载 API 和前端静态资源。

#### 核心实现（`main.ts`）

```typescript
const webDistPath = join(__dirname, '../../web/dist');

if (existsSync(webDistPath)) {
  // 1. 静态资源服务（JS/CSS/图片等）
  app.useStaticAssets(webDistPath, { index: false });

  // 2. SPA 回退中间件
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    } // API 路由穿透
    if (req.path.includes('.')) {
      next();
      return;
    } // 静态资源穿透
    res.sendFile(join(webDistPath, 'index.html')); // SPA fallback
  });
}
```

**关键设计**：

| 请求类型 | 路径特征                         | 处理方式                          |
| -------- | -------------------------------- | --------------------------------- |
| API 请求 | `/api/*`                         | `next()` 穿透到 NestJS Controller |
| 静态资源 | 含 `.` （如 `/assets/index.js`） | `next()` 到静态资源中间件         |
| 前端路由 | 其他（如 `/chat`、`/login`）     | 返回 `index.html`（SPA fallback） |

#### 部署命令

```bash
pnpm build    # 先构建前端，再构建后端
pnpm start    # 启动 NestJS（单端口 3000，同时服务 API + 前端）
# 或一条命令：
pnpm preview  # build + start
```

#### 为什么用 SPA Fallback？

React Router 使用 HTML5 History API（如 `/chat`、`/login`），这些路径在服务端不存在。用户直接访问 `/login` 时，NestJS 返回 `index.html`，然后 React Router 接管路由，渲染对应的页面组件。这是所有 SPA 应用部署的标准模式。

> 🎯 **面试考点**："单端口部署 vs 前后端分离部署怎么选？"
>
> - **单端口**（本项目）：Demo/小团队场景，部署简单，无跨域问题，一个进程搞定
> - **分离部署**（生产）：Nginx 反向代理 `/api` 到后端，`/` 到前端 CDN，各自独立扩缩容
> - 本项目通过 `if (existsSync(webDistPath))` 实现**条件启用**——开发时不存在 `web/dist`，自动跳过；生产构建后自动启用

---

## 六、前端核心模块逐层拆解

### 6.1 AuthContext —— 认证状态管理

#### 为什么用 Context + useReducer 而不是 Redux？

| 维度     | Redux                                    | Context + useReducer  |
| -------- | ---------------------------------------- | --------------------- |
| 适用规模 | 中大型应用                               | 中小型应用            |
| 学习成本 | 高（Action、Reducer、Store、Middleware） | 低（React 原生 API）  |
| 性能     | 需配合 memoization 优化                  | 简单场景无性能问题    |
| 调试     | Redux DevTools 强大                      | React DevTools 可查看 |
| 中间件   | Redux-Thunk / Redux-Saga                 | 无（手动处理异步）    |

本项目只有 3 个全局状态（user、isAuthenticated、isLoading），Context 完全够用。

#### AuthContext 的核心逻辑

```typescript
// 1. 创建 Context
const AuthContext = createContext<AuthContextType | null>(null);

// 2. Provider 组件
export const AuthProvider: FC = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  // 页面刷新时：从 localStorage 恢复 Token
  useEffect(() => {
    const token = localStorage.getItem('hr_rag_token');
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) setUser(decoded);
      else localStorage.removeItem('hr_rag_token');
    }
  }, []);

  // 登录：调用 API → 存 Token → 更新状态
  const login = useCallback(async (username, password) => {
    const response = await client.post('/auth/login', { username, password });
    localStorage.setItem('hr_rag_token', response.data.access_token);
    setUser(response.data.user);
  }, []);

  // 登出：清除 Token → 更新状态
  const logout = useCallback(() => {
    localStorage.removeItem('hr_rag_token');
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};
```

### 6.2 useChat Hook —— SSE 流式对话管理

#### 状态机设计

```
idle → sending → streaming → complete
  │      │          │            │
  └──────┴──────────┴──→ error ←─┘
```

| 状态        | 含义             | UI 表现                 |
| ----------- | ---------------- | ----------------------- |
| `sending`   | 已发送，等待首字 | 显示脉冲动画            |
| `streaming` | 正在接收流式数据 | 打字机效果逐字显示      |
| `complete`  | 接收完毕         | 显示来源引用卡片        |
| `error`     | 出错             | 显示错误信息 + 重试按钮 |

#### 关键实现：AbortController 取消生成

```typescript
const abortController = new AbortController();
abortRef.current = abortController;

// 发送请求时传入 signal
for await (const chunk of streamAsk(request, abortController.signal)) {
  // ...
}

// 用户点击"停止生成"或切换对话时
clearConversation = () => {
  if (abortRef.current) {
    abortRef.current.abort(); // 触发 fetch 的 AbortError
    abortRef.current = null;
  }
};
```

> 🎯 **面试考点**："AbortController 的原理是什么？"
>
> - `AbortController` 是浏览器原生 API，用于**取消异步操作**
> - 创建 `AbortController` 实例，获取其 `signal` 属性
> - 将 `signal` 传给 `fetch()`，调用 `controller.abort()` 时，`fetch` 会抛出 `AbortError`
> - 在代码中捕获 `AbortError`，不显示错误提示，静默处理

### 6.3 ThemeContext —— 主题系统

#### 防止 FOUC（Flash of Unstyled Content）

```html
<!-- index.html 中的内联脚本 -->
<script>
  (function () {
    const theme = localStorage.getItem('hr_rag_theme') || 'system';
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  })();
</script>
```

这段脚本在 `<head>` 中**同步执行**，在浏览器渲染任何内容之前就设置了 `data-theme`，避免页面先闪一下浅色再变深色。

> 🎯 **面试考点**："为什么要把这个脚本放在 `<head>` 中而不是 React 组件里？"
>
> - React 组件在 `<body>` 中执行，执行时浏览器可能已经开始渲染
> - 放在 `<head>` 中的同步脚本会在**解析 HTML 时就执行**，在渲染前完成主题设置
> - 这是"性能优化"和"用户体验"的经典考点

---

## 七、RAG 链路全流程深度解析

### 7.1 完整数据流（以"年假怎么请？"为例）

```
【用户输入】"年假怎么请？"
    │
    ▼
【前端】useChat.sendMessage()
    ├── 生成 conversationId（如 conv-1715...）
    ├── 添加用户消息到消息列表
    ├── 添加助手消息（空内容，状态 sending）
    └── fetch('/api/ask', { body: { question, conversationId } })
    │
    ▼
【后端】AskController.ask()
    ├── 设置响应头：Content-Type: text/event-stream
    ├── 启动心跳定时器（每 15 秒）
    └── 调用 RAGService.orchestrate(question, conversationId, userId)
    │
    ▼
【后端】RAGService.orchestrate()
    ├── Step 1: ChatService.getOrCreateConversation(convId)
    ├── Step 2: EmbeddingService.embed("年假怎么请？") → 768维向量
    │   └── POST http://localhost:11434/api/embeddings
    │       请求: { model: "nomic-embed-text", prompt: "年假怎么请？" }
    │       响应: { embedding: [0.023, -0.015, ...] }  // 768个浮点数
    │
    ├── Step 3: VectorStore.search(embedding, 3) → Top-3 相似 chunk
    │   └── 遍历所有 chunk，计算点积，排序取前3
    │       结果: [
    │         { chunkId: "...", content: "## 年假申请流程...", similarity: 0.92 },
    │         { chunkId: "...", content: "## 年假天数规定...", similarity: 0.85 },
    │         ...
    │       ]
    │
    ├── Step 4: KeywordSearch.search("年假怎么请？", chunks, 3)
    │   └── 提取关键词：["年假"]
    │       对每个 chunk 计分：标题匹配 +3，内容词频累加，分类匹配 +2
    │       归一化后取 Top-3
    │
    ├── Step 5: mergeResults(vectorResults, keywordResults, 3)
    │   └── 向量结果 × 0.4 + 关键词结果 × 0.6
    │       结果: [
    │         { chunkId: "...", hybridScore: 0.89, sources: ['vector', 'keyword'] },
    │         ...
    │       ]
    │
    ├── Step 6: shouldReject(merged, query)
    │   └── 最高 hybridScore = 0.89 > 0.5 → 不拒绝
    │       不涉及隐私/机密 → 不拒绝
    │       包含 HR 关键词 → 不拒绝
    │
    ├── Step 7: isPersonalQuery("年假怎么请？")
    │   └── 不含"我/我的" → false → 不注入个人数据
    │
    ├── Step 8: buildPrompt(query, merged, history, "（未提供）")
    │   └── System Prompt + 检索片段 + 对话历史 + 当前问题
    │       总 Token 估算 < 28000 → 无需截断
    │
    ├── Step 9: LLMService.generate(prompt)
    │   └── POST http://localhost:11434/api/generate
    │       请求: { model: "qwen2.5:7b-instruct", prompt, stream: true, options: { temperature: 0.3 } }
    │       响应: NDJSON 流（逐 token 返回）
    │
    └── Step 10: 逐 token yield 给 AskController
    │
    ▼
【后端】AskController 逐 chunk 发送 SSE
    data: {"chunk": "根据", "done": false}\n\n
    data: {"chunk": "《年假制度》", "done": false}\n\n
    ...
    data: {"chunk": "", "done": true, "sources": [...]}\n\n
    │
    ▼
【前端】sse.ts 解析 SSE 流
    ├── 逐字累加到 assistantMsg.content
    ├── 每帧用 requestAnimationFrame 节流渲染
    └── done=true 时：更新状态为 complete，显示 sources
    │
    ▼
【前端】ChatMessage 组件渲染
    ├── 助手消息气泡显示完整回答
    └── 底部显示 SourceCitation 卡片（文档名 + 相似度）
```

### 7.2 性能热点分析

| 环节           | 耗时估算          | 优化空间                        |
| -------------- | ----------------- | ------------------------------- |
| Embedding 生成 | 200-500ms         | Ollama 首次加载慢， warmed 后快 |
| 向量检索       | < 1ms（全量遍历） | 数据量大时换 ANN 索引           |
| 关键词检索     | < 1ms             | 无（纯内存计算）                |
| LLM 首 Token   | 3-8 秒            | 模型量化（INT4）、GPU 加速      |
| LLM 完整生成   | 5-15 秒           | 调整 max_tokens、使用更快的模型 |
| 端到端总耗时   | 10-25 秒          | 主要瓶颈在 LLM 推理             |

---

## 八、面试官视角：深入问题与回答策略

以下问题基于**国内前端大厂**（字节、阿里、腾讯、美团、米哈游等）的技术面试风格整理，按技术领域分类。

### 8.1 RAG 与检索算法

#### Q1：你们项目的文档分块策略是什么？为什么这么设计？如果文档量增长到 1000 篇，你会怎么优化？

**回答框架**：

1. **当前策略**：按 Markdown `##` 二级标题切分，最大 512 字符，重叠 50 字符，每文档最多 10 个 chunk
2. **设计依据**：HR 文档天然按章节组织，`##` 对应独立主题；512 字符平衡语义完整性和 Embedding 效果
3. **优化方向**：
   - **语义切分**：用 Embedding 相似度判断语义断点，保持每块语义连贯
   - **层次化索引**：文档级 → 章节级 → chunk 级，先粗排再精排
   - **元数据增强**：为每个 chunk 添加更多元数据（关键词标签、摘要），提升检索精度

#### Q2：混合检索的权重 0.4 + 0.6 是怎么确定的？如果换到电商商品检索场景，权重应该怎么调？

**回答框架**：

1. **确定方法**：基于标注测试集，调整权重后计算准确率和召回率，选择最优组合
2. **HR 场景选 0.4+0.6 的原因**：关键词检索更可靠，因为 HR 术语固定、用户问题通常包含明确关键词
3. **电商场景调整**：
   - 向量权重应提高（如 0.7），因为用户可能用"舒服的运动鞋"这种语义描述，而非精确商品名
   - 关键词权重降低（如 0.3），用于补充品牌名、型号等精确匹配

#### Q3：你们的幻觉控制是怎么做的？四层防御分别解决什么问题？有没有遗漏的场景？

**回答框架**：

1. **四层防御逐层解释**（见 5.3 节表格）
2. **遗漏场景**：
   - 回答中引用了正确的文档，但**解释错误**（如将"年假 5 天"解释为"年假 5 个工作日"）
   - **时序幻觉**：文档已更新，但回答引用了旧版本
   - **过度概括**：将个别案例推广为通用规则
3. **改进方案**：
   - 引入大模型自校验（让 LLM 检查自己的回答是否与检索片段一致）
   - 添加文档版本管理，显示"基于 2024-03 版本制度"

#### Q4：余弦相似度和欧氏距离有什么区别？你们为什么选余弦相似度？

**回答框架**：

1. **余弦相似度**：衡量方向相似性，与向量长度无关，值域 [-1, 1]
2. **欧氏距离**：衡量绝对距离，与向量长度有关，值域 [0, +∞)
3. **选择余弦的原因**：
   - Embedding 模型输出已归一化，长度相同，此时余弦相似度 = 点积，计算更高效
   - 文本语义相似度关注"方向"而非"长度"（两篇长文档和两篇短文档可能语义相同）
4. **适用场景对比**：
   - 余弦：文本语义、推荐系统
   - 欧氏：聚类分析、需要绝对距离的场景

### 8.2 系统设计与架构

#### Q5：为什么用 NestJS 而不是 Express？如果团队只有 2 个人，你会怎么选？

**回答框架**：

1. **NestJS 优势**：模块化、依赖注入、装饰器、AOP、可测试性
2. **2 人团队的选择**：
   - 如果项目会长期维护、可能扩展 → 仍选 NestJS，前期投入换来后期维护性
   - 如果只是 1 周原型验证 → Express 更快
3. **关键认知**：框架选择取决于**项目生命周期**和**团队规模**，不是绝对的

#### Q6：你们的向量存储是内存实现，如果服务重启怎么办？生产环境你会怎么设计？

**回答框架**：

1. **当前方案**：启动时自动加载 `docs/hr-documents/` 下的所有文档，重新分块、生成 Embedding、建立索引
2. **重启影响**：
   - 索引重建时间：5-10 秒（取决于文档量和模型速度）
   - 对话历史丢失（也是内存存储）
3. **生产方案**：
   - **持久化**：使用 Chroma / Milvus / PostgreSQL + pgvector 持久化向量和索引
   - **增量更新**：新文档上传时只增量添加，不清空重建
   - **快照机制**：定期导出索引快照，重启时快速恢复
   - **分布式**：多实例共享向量数据库，避免单点

#### Q7：你们的认证是内存 JWT，如果要在生产环境使用，还需要做哪些改进？

**回答框架**：

1. **当前问题**：
   - 无法主动失效 Token（如用户修改密码后旧 Token 仍有效）
   - 无法查看"当前有哪些用户在线"
   - 密码明文存储
2. **改进方案**：
   - **Refresh Token 机制**：Access Token 短期（15 分钟），Refresh Token 长期（7 天）
   - **Token 黑名单**：Redis 存储已注销的 Token ID，验证时先查黑名单
   - **密码哈希**：bcrypt / Argon2 哈希存储
   - **OAuth 2.0 / SSO**：接入企业微信、钉钉等企业身份源

### 8.3 前端工程化

#### Q8：你们前端状态管理用 Context + useReducer，什么时候应该切换到 Redux/Zustand？

**回答框架**：

1. **当前选择 Context 的原因**：只有 3 个全局状态，Context 足够简单
2. **需要切换的信号**：
   - 状态更新逻辑复杂，Reducer 变得臃肿
   - 跨组件通信频繁，出现"Prop Drilling"
   - 需要时间旅行调试、中间件（如日志、持久化）
   - 状态量增大，Context 的频繁更新导致不必要的重渲染
3. **Zustand 的优势**：轻量、无 Provider 嵌套、支持选择器订阅、TypeScript 友好

#### Q9：SSE 和 WebSocket 有什么区别？你们为什么选 SSE？如果未来要支持语音输入，需要改什么？

**回答框架**：

1. **SSE vs WebSocket**（见 3.5 节表格）
2. **选 SSE 的原因**：单向通信足够、HTTP 兼容性好、实现简单
3. **支持语音输入的改造**：
   - 前端：引入 Web Audio API 录音，发送音频数据到后端
   - 后端：接入 ASR（语音识别）服务，将语音转为文本后进入现有 RAG 链路
   - 如果还要语音输出：需要 WebSocket 或 WebRTC 传输音频流

#### Q10：你们的 Markdown 渲染是自研的，为什么不用 marked / react-markdown？

**回答框架**：

1. **自研的原因**：
   - HR 文档的 Markdown 语法简单（只有标题、列表、加粗），不需要完整 Markdown 引擎
   - 减少依赖包体积（marked 约 50KB，react-markdown 约 200KB+）
   - 完全可控，避免 XSS 漏洞（自研渲染可确保所有输出都经过 escapeHtml）
2. **使用库的权衡**：
   - 如果文档复杂度增加（表格、数学公式、代码高亮），应切换为 react-markdown + rehype/sanitize

### 8.4 AI 与 Prompt Engineering

#### Q11：你们的 System Prompt 是怎么设计的？Temperature 为什么是 0.3？

**回答框架**：

1. **System Prompt 结构**：
   - 角色定义（"你是企业 HR 助手"）
   - 核心规则（知识边界、准确性优先、来源引用、隐私保护）
   - 动态内容占位符（检索片段、个人数据、对话历史、当前问题）
2. **Temperature = 0.3 的依据**：
   - RAG 场景需要**事实性**，低温度使模型更"保守"，减少创造性发挥
   - 0.3 是平衡值：太低（如 0.1）回答可能生硬；太高（如 0.7）容易幻觉
   - 根据测试集效果调整
3. **其他参数**：
   - `top_p = 0.9`：核采样，控制候选 token 的累计概率阈值
   - `max_tokens = 1024`：限制生成长度，避免过长回答

#### Q12：如果用户问"你们公司的年假制度合理吗？"，系统会怎么回答？你会怎么改进？

**回答框架**：

1. **当前行为**：
   - 检索到年假制度文档，相似度高，进入 LLM 生成
   - LLM 可能回答"根据《年假制度》，年假天数为..."，但不会评价"是否合理"
   - 因为 System Prompt 约束"只能基于检索片段回答"
2. **改进方向**：
   - 识别主观评价类问题，在 System Prompt 中增加"对于主观评价类问题，可提供制度依据，但不发表个人意见"
   - 或在前端增加快捷回复："我可以告诉您制度规定，但无法评价是否合理"

#### Q13：你们的 RAG 准确率怎么评估？有没有做测试集？

**回答框架**：

1. **评估指标**：
   - **回答准确率**：准备 20 个已知答案的问题，人工判断回答是否正确
   - **幻觉控制率**：准备 10 个文档外问题，统计拒绝率（目标 > 90%）
   - **检索召回率**：问题的正确答案是否在 Top-3 检索结果中
2. **测试集构建**：
   - 覆盖每个文档类别的 3-5 个问题
   - 包含边界问题（如"试用期有年假吗？"）
   - 包含负例（如"公司食堂在哪里？"应拒绝）
3. **持续优化**：
   - 每轮测试记录失败案例，分析是检索问题还是生成问题
   - 检索问题 → 调整分块策略或权重
   - 生成问题 → 优化 Prompt 或参数

### 8.5 工程实践与团队协作

#### Q14：Spec-Driven 开发中，如果代码已经写完了，但需求变了，是改代码还是改 Spec？

**回答框架**：

1. **核心原则**：**Spec 是单一事实来源**，代码是 Spec 的实现
2. **流程**：
   - 需求变更 → 先更新 Spec → 让 AI（或人）基于新 Spec 重构代码
   - 这样可以保证 Spec 始终反映最新需求，新成员入职先看 Spec 就能理解系统
3. **例外**：紧急 Bug 修复可以直接改代码，但事后必须同步更新 Spec
4. **价值**：
   - 需求可追溯（任何功能都能在 Spec 中找到依据）
   - 新成员 onboarding 快（读 Spec 而非读代码理解业务）
   - AI 辅助开发（AI 基于 Spec 生成代码，而非凭空编造）

#### Q15：你们项目没有连接数据库，如果面试官质疑"这不是真实项目"，你怎么回应？

**回答框架**：

1. **明确项目定位**：这是一个**技术演示和学习项目**，目标是展示 RAG 全链路的工程能力，而非完整的 SaaS 产品
2. **架构可扩展性**：
   - 向量存储已通过 `IVectorStore` 接口抽象，可一键切换 Chroma / Milvus
   - 认证可通过 JWT 模块替换接入 OAuth / SSO
   - 用户数据可扩展为连接真实 HR 系统的 API
3. **技术深度**：
   - 自研 RAG Pipeline（而非调用 LangChain 一行代码）
   - 混合检索算法的实现和调优
   - 四层幻觉防御的设计
   - SSE 流式传输的完整实现
4. **面试策略**：主动说明"当前是 MVP 状态，生产环境会做以下改进..."，展示你对生产环境的思考

---

## 九、学习路径建议

### Phase 1：理解全貌（1-2 天）

1. 通读本文档，建立技术全景图
2. 按 README 启动项目，体验所有功能
3. 阅读 `PRD.md` 和 `ARCHITECTURE.md`，理解"做什么"和"怎么搭"

### Phase 2：深入后端（3-5 天）

1. 从 `main.ts` 开始，跟踪后端启动流程
2. 重点理解 `RAGService.orchestrate()` 的每一步
3. 手写一次余弦相似度计算，理解向量检索原理
4. 尝试调整混合检索权重，观察回答变化

### Phase 3：深入前端（2-3 天）

1. 从 `main.tsx` 开始，理解 React 应用的渲染流程
2. 重点理解 `useChat.ts` 的 SSE 状态机
3. 尝试添加一个新页面，练习 React Router + Context

### Phase 4：面试准备（持续）

1. 熟记本文档第八章的面试问题，用自己的话组织答案
2. 准备 3-5 个项目的亮点故事（如"我如何设计个人数据注入机制"）
3. 关注 AI 领域动态（RAG、Agent、MCP 等），保持技术敏感度

---

### 写在最后

这个项目的价值不在于功能有多复杂，而在于它覆盖了**全栈 AI 应用开发的完整链路**：

- 从需求分析到 Spec 定义
- 从向量检索到 Prompt Engineering
- 从 JWT 认证到 SSE 流式传输
- 从 CSS Variables 到响应式布局

面试官关心的不是你用了多少第三方库，而是你对**每个技术决策背后的权衡**是否有深入理解。

祝面试顺利！

# Knowledge Index — 领域知识沉淀

> 本文档是项目的"活字典"，记录踩坑、最佳实践、隐性经验。
>
> 知识飞轮：需求实践 → 踩坑 → 沉淀 knowledge → AI 更准 → 更好的实践

---

## 知识索引（按关键词触发）

| 关键词   | 知识文件             | 状态      | 内容概要                                                                                                                                                    |
| -------- | -------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ollama   | `ollama-setup.md`    | ✅ 已沉淀 | 重试指数退避（`embed.service.ts:64-88`）、文本预处理（去 Markdown 符号 + 截断 4000 字符）、维度校验（768）、AbortSignal.timeout 超时、Streaming JSON 行解析 |
| NestJS   | `nestjs-patterns.md` | ✅ 已沉淀 | AppModule → 10 子模块组织、全局 AuthGuard + @Public() 装饰器、Token DI（`LLM_CONFIG`/`EMBEDDING_CONFIG`）、OnModuleInit 文档加载、AsyncGenerator 流式       |
| RAG      | `rag-tuning.md`      | ✅ 已沉淀 | 混合检索权重（向量 0.4 + 关键词 0.6）、阈值 0.5、四级拒绝策略、Token 估算（CJK=1/ASCII=0.5）、三级上下文压缩、追问生成、用户画像注入                        |
| SSE      | `sse-patterns.md`    | ✅ 已沉淀 | SSE 响应头（`X-Accel-Buffering: no`）、15s 心跳 + `req.on('close')` 清理、前端 `ReadableStream` + buffer 解析 + `requestAnimationFrame` 批量渲染            |
| Theme    | `theme-css.md`       | ✅ 已沉淀 | CSS Variables 三模式（light/dark/system）、`prefers-color-scheme` 媒体查询、localStorage 持久化、CSS Modules 组件隔离                                       |
| 文件上传 | `upload-patterns.md` | ✅ 已沉淀 | Multer multipart、`.md` 扩展名白名单、1MB 限制、上传后全量索引重建（清空 → 加载 → 批量 Embedding）、HR 角色限制                                             |
| Git      | `git-workflow.md`    | ✅ 已沉淀 | release-please + GitHub Actions CI/CD、Conventional Commits 规范、SDAD 开发流程                                                                             |

---

## 已沉淀知识点（可被 AI Agent 直接引用）

### 1. Ollama 模型维度校验

`vector-store.service.ts:13-16` 和 `embed.service.ts:74-77` 双重校验 Embedding 维度为 768。向量入库前检查 `NaN`/`Infinity`（`vector-store.service.ts:19-21`），避免无效向量污染索引。

### 2. NestJS Module 间依赖注入

10 个模块均通过 NestJS constructor DI 注入，`AppModule`（`app.module.ts:16-33`）集中导入，无循环依赖。配置通过 `@Inject(token)` 模式传递（`LLM_CONFIG`/`EMBEDDING_CONFIG`），业务逻辑与配置解耦。

### 3. RAG 混合检索权重选择

关键词权重 0.6 > 向量权重 0.4（`rag.service.ts:21-22`）。原因：HR 领域专业术语（年假、报销、考勤等）通过关键词匹配更精准，向量相似度作为补充覆盖语义相近但用词不同的查询。

### 4. SSE 连接在代理环境下的配置要点

NestJS 端（`ask.controller.ts:22-26`）设置 `X-Accel-Buffering: no`（禁用 nginx 缓冲）、`Cache-Control: no-cache`、`Connection: keep-alive`，并调用 `res.flushHeaders()` 立即发送响应头。前端（`sse.ts:24-70`）按 `\n\n` 分段解析 SSE 帧，从 `data: ` 行提取 JSON。

### 5. 中文 Token 估算

`rag.service.ts:305-307`：中文字符（`charCode > 127`）计 1 token，ASCII 计 0.5 token。用于上下文窗口压缩判断——总 Token 超过 28000 时触发三级压缩（全量 → 6 轮 → 2 轮历史）。

### 6. RAG 四级拒绝策略

`rag.service.ts:197-228`：

1. **阈值过滤** — 最高 hybridScore < 0.5 且无个人数据，直接拒绝
2. **关键词兜底** — 无关键词匹配且向量最高分 < 0.5，拒绝
3. **隐私保护** — 匹配 `([人名]的(工资|薪资))` 等正则，拒绝
4. **机密保护** — 匹配 `裁员|并购|财报` 等敏感词，拒绝
5. **个人数据豁免** — `hasPersonalData=true` 时跳过阈值检查

### 7. 前端 SSE 流式渲染优化

`useChat.ts:73-89`：通过 `requestAnimationFrame` 批量合并 token，先积累到 `pendingTokens[]`，再在一个 rAF 帧内拼接后调用 `setMessages`，避免每个 token 触发一次 React 重渲染。

### 8. 个人数据查询检测

`user-profile.service.ts:16-35`：三步正则检测：

- 第一人称（`我|我的|本人`） + HR 关键词（`年假|报销|考勤|工资` 等）
- 数量模式（`还剩|还有|用了|多少|几天`）
- 状态模式（`可以|能不能|是否符合|有没有资格`）

### 9. 文档自动分类策略

`document-loader.service.ts:149-157`：基于文件名的关键词匹配分类。5 个内置类别对应各自关键词（见 `CATEGORIES` 数组），未命中则 fallback 到 `custom`（自定义，灰色标识）。

### 10. Embedding 重试机制

`embed.service.ts:64-90`：调用 Ollama Embedding API 时，失败后按 `Math.pow(2, attempt) * 1000` ms 指数退避重试，最大重试次数通过 `EmbeddingConfig.maxRetries` 配置。

### 11. AbortController + AbortError 静默处理

`useChat.ts:139`：SSE 请求通过 `AbortController` 取消，catch 块中判断 `error.name === 'AbortError'` 时静默跳过，不显示错误提示。仅在非取消类异常时才更新 UI 为 error 状态。

### 12. NestJS AsyncGenerator 流式模式

`rag.service.ts:66` 定义 `async *orchestrate()` Generator，内部 `yield` 状态提示和 token。`ask.controller.ts:40` 通过 `for await (const chunk of stream)` 消费，转换为 `res.write()` 的 SSE 帧。业务逻辑（Service）与传输协议（Controller）解耦。

---

## 架构决策速查

| 决策    | 文件                      | 要点                                                                                        |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| ADR-001 | `ARCHITECTURE.md:108-112` | NestJS 而非 Express — 模块化、DI、可测试性                                                  |
| ADR-002 | `ARCHITECTURE.md:114-120` | Ollama 本地模型而非云端 API — Demo 零注册零费用；LLM/Embedding 通过接口抽象，可一键切换     |
| ADR-003 | `ARCHITECTURE.md:122-128` | In-Memory VectorStore 而非 Chroma — 当前 50-100 片段足够；`IVectorStore` 接口预留扩展点     |
| ADR-004 | `ARCHITECTURE.md:130-135` | 内存用户表 + JWT 而非数据库 — MVP 仅需区分 employee/hr 两种角色                             |
| ADR-005 | `ARCHITECTURE.md:137-142` | 自研 RAG Pipeline 而非 LangChain — 精细控制检索阈值、Prompt、混合检索权重，可控性优于抽象层 |
| ADR-008 | `ARCHITECTURE.md:157-162` | `.md` 文件上传 + 自动索引重建 — 用户可扩展知识库，PDF/Word 超出 MVP 范围                    |

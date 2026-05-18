# Specs 目录说明

> 本目录存放**模块级 Spec**，是驱动代码生成的直接输入。每个模块 Spec 是其对应业务代码的**单一事实来源**。
>
> 当需要修改某个模块的业务逻辑时，**优先更新本目录下的对应 Spec 文件**，再让 AI 基于更新后的 Spec 重构代码。
>
> **关于代码块中的 IDE 类型报错**：本目录下的 Markdown 文件中包含大量 ` ```typescript ` 参考伪代码。由于 Spec 文件本身不是可编译的 TypeScript 项目，伪代码中引用的类型（如 `SearchResult`、`MergedResult`、`Message`）和服务实例（如 `embeddingService`、`vectorStore`）定义在其他模块的 Spec 或最终代码中，IDE 的语言注入功能会对这些未定义引用报错。**这些报错不影响 Spec 的正确性，属正常现象，无需修复。**

---

## 目录结构

```
specs/
├── README.md              ← 本文档
└── modules/               ← 模块级 Spec（代码直接驱动源）
    ├── auth-spec.md       ← 登录认证模块
    ├── theme-spec.md      ← Theme 主题系统模块
    ├── chat-spec.md       ← Chat 对话模块
    ├── api-spec.md        ← 后端 API 接口规范模块
    ├── embedding-spec.md  ← Embedding 向量生成模块
    ├── chunk-spec.md      ← 文档分块模块
    ├── rag-spec.md        ← RAG 检索增强生成模块
    ├── document-spec.md   ← 文档管理模块（浏览+上传）
    ├── llm-spec.md        ← LLM 大模型生成模块
    ├── vector-spec.md     ← 向量存储模块
    └── user-profile-spec.md ← 用户个人数据（新增）
```

---

## 文档体系三层架构

```
┌─────────────────────────────────────────────────────────┐
│                    项目级 Spec（宪法层）                    │
│  DESIGN.md / PRD.md / AI-SPEC.md / ARCHITECTURE.md      │
│  → 定义全局规则、架构决策、产品需求                        │
├─────────────────────────────────────────────────────────┤
│                    变更级 Spec（法案层）                    │
│  changes/phase-1-infrastructure/spec.md                  │
│  changes/phase-2-rag-engine/spec.md                      │
│  changes/phase-3-user-experience/spec.md                 │
│  changes/phase-4-extension/spec.md                       │
│  → 按 Phase 划分功能域，定义范围边界和验收标准              │
├─────────────────────────────────────────────────────────┤
│                    模块级 Spec（执行层）                    │
│  specs/modules/auth-spec.md                              │
│  specs/modules/chat-spec.md                              │
│  specs/modules/rag-spec.md                               │
│  ...                                                     │
│  → 代码直接驱动源，包含接口、数据流、状态机、UI 规范        │
└─────────────────────────────────────────────────────────┘
```

**更新优先级**：当实现与 Spec 冲突时，从下往上更新：
1. 先更新模块级 Spec（反映具体实现需求）
2. 必要时更新变更级 Spec（反映 Phase 范围变化）
3. 必要时更新项目级 Spec（反映全局规则变化）

---

## 各模块对应代码位置

| 模块 Spec | 前端代码 | 后端代码 |
|-----------|---------|---------|
| auth-spec.md | `apps/web/src/context/AuthContext.tsx`<br>`apps/web/src/pages/LoginPage.tsx` | `apps/api/src/auth/*` |
| theme-spec.md | `apps/web/src/context/ThemeContext.tsx`<br>`apps/web/src/styles/variables.css` | — |
| chat-spec.md | `apps/web/src/hooks/useChat.ts`<br>`apps/web/src/pages/ChatPage.tsx`<br>`apps/web/src/components/Chat/*` | `apps/api/src/ask/*`<br>`apps/api/src/chat/*` |
| api-spec.md | `apps/web/src/api/*` | `apps/api/src/**/*.controller.ts` |
| embedding-spec.md | — | `apps/api/src/embed/*` |
| chunk-spec.md | — | `apps/api/src/document/document-loader.service.ts` |
| rag-spec.md | — | `apps/api/src/rag/*` |
| document-spec.md | `apps/web/src/pages/DocumentPage.tsx`<br>`apps/web/src/components/Document/*` | `apps/api/src/document/document.controller.ts`<br>`apps/api/src/document/document-upload.service.ts` |
| llm-spec.md | — | `apps/api/src/llm/*` |
| vector-spec.md | — | `apps/api/src/vector/*` |
| user-profile-spec.md | `apps/web/src/components/Profile/`（可选） | `apps/api/src/user-profile/*` |

---

## 如何使用模块级 Spec 驱动代码

### 场景 1：修改登录逻辑

```bash
# 1. 编辑模块 Spec
vim specs/modules/auth-spec.md
# 例如：增加 Token 刷新机制、修改过期时间

# 2. 让 AI 基于更新后的 Spec 重构代码
# 在 Claude Code / CC GUI 中：
# "请根据 specs/modules/auth-spec.md 的最新版本，更新 apps/api/src/auth/ 和 apps/web/src/context/AuthContext.tsx"

# 3. 提交变更
git add specs/modules/auth-spec.md apps/
git commit -m "docs(auth): update token refresh mechanism in auth-spec

- Change JWT expiresIn from 7d to 1d
- Add refresh token rotation strategy
- Update frontend auto-refresh logic"

git commit -m "feat(auth): implement token refresh mechanism

- Add refresh token endpoint POST /api/auth/refresh
- Implement token rotation in AuthService
- Add auto-refresh interceptor in frontend Axios
- Verified: token refreshes 5min before expiry"
```

### 场景 2：调整 RAG 检索参数

```bash
# 1. 编辑模块 Spec
vim specs/modules/rag-spec.md
# 例如：similarity_threshold 从 0.5 改为 0.45

# 2. 让 AI 基于更新后的 Spec 重构代码
# "请根据 specs/modules/rag-spec.md 更新 RAGService 的阈值参数"

# 3. 提交变更（Spec 和代码分开提交）
git add specs/modules/rag-spec.md
git commit -m "docs(rag): lower similarity threshold from 0.5 to 0.45

- Testing showed 0.5 was too strict for short queries
- Expected: improve recall by ~15% with minimal precision loss"

git add apps/api/src/rag/
git commit -m "feat(rag): adjust retrieval threshold to 0.45

- Update RAGService.similarity_threshold constant
- Re-test with 20 benchmark questions
- Verified: recall improved from 65% to 82%"
```

---

## Spec 演进原则

1. **先 Spec 后代码**：任何业务逻辑变更，先更新 Spec，再驱动代码
2. **模块隔离**：每个模块 Spec 独立演进，不影响其他模块
3. **接口锁定**：模块间通过接口通信，接口变更需同步更新双方 Spec
4. **版本追溯**：每个 Spec 文件底部保留演进记录
5. **单一职责**：一个模块 Spec 只关注一个业务领域

---

## 模块间依赖图

```
                    ┌─────────────┐
                    │   api-spec  │ ← 全局接口契约
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐      ┌─────┴─────┐     ┌─────┴─────┐
   │  auth   │◄────►│   chat    │◄───►│ document  │
   └────┬────┘      └─────┬─────┘     └─────┬─────┘
        │                 │                 │
        │            ┌────┴────┐            │
        │            │  rag    │            │
        │            └────┬────┘            │
        │       ┌─────────┼─────────┐       │
        │       │         │         │       │
   ┌────┴───┐ ┌─┴────┐ ┌──┴───┐ ┌───┴───┐ ┌─┴────┐
   │  theme │ │embedding│ │ llm  │ │ vector │ │ chunk │
   └────────┘ └───────┘ └──────┘ └───────┘ └───────┘
        ▲
        │
   ┌────┴────┐
   │ user-profile │ ← 被 rag 依赖（个人数据注入）
   └─────────┘
```

> 箭头方向表示依赖关系（A → B 表示 A 依赖 B）

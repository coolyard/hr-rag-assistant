# CONTRIBUTING.md — Git Workflow 与贡献指南

> 本文档定义本项目的 Git 工作流程、分支策略、提交规范。所有开发者（包括 AI）必须遵守。

---

## 1. 分支模型（Git Branching Model）

本项目采用 **Git Flow 简化版**：

```
main
  │
  ├── develop
  │     │
  │     ├── feature/phase-1-infrastructure
  │     ├── feature/phase-2-rag-engine
  │     ├── feature/phase-3-user-experience
  │     └── feature/phase-4-extension
  │
  └── hotfix/xxx (如有紧急修复)
```

### 1.1 分支说明

| 分支                | 用途                              | 保护规则                                   |
| ------------------- | --------------------------------- | ------------------------------------------ |
| **main**            | 生产就绪的 Spec 稳定版本          | 禁止直接推送，仅接受 PR 合并               |
| **develop**         | 开发主分支，集成各 Phase 完成代码 | 禁止直接推送，仅接受 feature 分支合并      |
| **feature/phase-X** | 各变更域的开发分支                | 从 develop 检出，完成后合并回 develop      |
| **hotfix/xxx**      | 紧急修复                          | 从 main 检出，完成后合并到 main 和 develop |

### 1.2 分支命名规范

- 功能分支：`feature/phase-<N>-<简短描述>`
  - 示例：`feature/phase-1-infrastructure`
  - 示例：`feature/phase-2-rag-engine`
- 修复分支：`hotfix/<问题描述>`
  - 示例：`hotfix/login-token-expiry`

---

## 2. 提交规范（Conventional Commits）

### 2.1 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.2 Type 类型

| Type       | 用途                 | 示例                                                            |
| ---------- | -------------------- | --------------------------------------------------------------- |
| `feat`     | 新功能               | `feat(phase-2): implement RAG orchestration service (Task-004)` |
| `fix`      | Bug 修复             | `fix(phase-3): correct Theme toggle state persistence`          |
| `docs`     | 文档更新             | `docs: update AI-SPEC similarity threshold to 0.45`             |
| `refactor` | 重构                 | `refactor(phase-1): migrate from Express to NestJS`             |
| `chore`    | 构建/工具链          | `chore: initialize project with Spec-Driven Development docs`   |
| `style`    | 代码格式             | `style(phase-3): fix CSS indentation in ThemeContext`           |
| `test`     | 测试（当前版本跳过） | `test(phase-2): add RAG retrieval accuracy tests`               |

### 2.3 Scope 范围

- `phase-1`：技术基建
- `phase-2`：AI 核心引擎
- `phase-3`：用户交互体验
- `phase-4`：协议扩展
- `global`：跨 Phase 的变更
- `docs`：仅文档变更

### 2.4 提交信息示例

```bash
# 完成 Task-001
feat(phase-1): initialize NestJS + React project structure (Task-001)

- Setup pnpm workspace with apps/api and apps/web
- Configure TypeScript strict mode
- Add initial package.json and tsconfig.json

# 完成 Task-004
feat(phase-2): implement RAG orchestration service (Task-004)

- Add hybrid retrieval (vector 0.4 + keyword 0.6)
- Implement cosine similarity calculation
- Add merge and deduplication logic
- Verified: 年假问答返回 Top-3 片段，相似度 > 0.5

# 修复 Bug
fix(phase-3): resolve JWT token expiration handling

- Add token refresh logic in AuthContext
- Handle 401 response to redirect to login page

# 更新 Spec
docs: update AI-SPEC retrieval threshold from 0.5 to 0.45

- Testing showed 0.5 was too strict, causing excessive rejections
- Updated threshold in AI-SPEC.md and RAGService
```

---

## 3. 开发 Workflow

### 3.1 开始新 Phase

```bash
# 1. 确保在 develop 分支
 git checkout develop
 git pull origin develop

# 2. 创建功能分支
 git checkout -b feature/phase-1-infrastructure

# 3. 开始开发（按 Task 逐个实现）
```

### 3.2 完成一个 Task

```bash
# 1. 添加变更文件
 git add .

# 2. 提交（遵循 Conventional Commits）
 git commit -m "feat(phase-1): configure Ollama client for LLM and Embedding (Task-002)

- Implement ILLMService interface with Ollama HTTP client
- Implement IEmbeddingService interface with nomic-embed-text
- Add health check endpoint for Ollama connectivity"

# 3. 继续下一个 Task...
```

### 3.3 完成一个 Phase

```bash
# 1. 确保所有 Task 已完成并提交
 git log --oneline

# 2. 推送到远程
 git push -u origin feature/phase-1-infrastructure

# 3. 在 GitHub 上创建 Pull Request，合并到 develop
# PR 标题：feat(phase-1): complete infrastructure setup
# PR 描述：列出完成的 Task 和验收标准

# 4. 合并后，本地更新
 git checkout develop
 git pull origin develop
```

### 3.4 Spec 演进时的 Git 操作

当发现 Spec 漏洞需要更新时：

```bash
# 1. 在 develop 分支直接修改 Spec（Spec 变更不需要 feature 分支）
 git checkout develop

# 2. 修改 DESIGN.md / AI-SPEC.md 等

# 3. 提交（使用 docs: 类型）
 git add DESIGN.md AI-SPEC.md
 git commit -m "docs: update AI-SPEC retrieval threshold to 0.45

- Testing showed excessive rejections at 0.5
- Adjusted to 0.45 to balance precision and recall
- Updated Layer 1 hallucination control accordingly"

# 4. 让 AI 基于新 Spec 重构代码
# 5. 代码重构完成后，使用 feat: 或 fix: 提交
```

---

## 4. 代码审查（Code Review）

### 4.1 审查清单

审查者（或 AI 自我审查）必须检查：

- [ ] 代码是否符合 `.cursorrules` 技术栈约束？
- [ ] 是否违反 `AI-SPEC.md` 的 Prompt 模板或参数？
- [ ] `pnpm lint` 是否通过？
- [ ] `pnpm format:check` 是否通过？
- [ ] 是否有 `any` 类型？
- [ ] 是否缺少 `try-catch`？
- [ ] 模块边界是否清晰？
- [ ] 是否对应到某个 Task？提交信息是否引用 Task 编号？

### 4.2 PR 模板

创建 PR 时使用 `.github/pull_request_template.md`：

```markdown
## 变更描述

<!-- 描述这个 PR 做了什么 -->

## 关联 Task

<!-- 列出完成的 Task 编号 -->

- Task-001: ...
- Task-002: ...

## 验收标准

<!-- 列出验证通过的标准 -->

- [ ] ...
- [ ] ...

## Spec 变更

<!-- 如果有 Spec 变更，列出变更内容 -->

- ...

## 测试方式

<!-- 如何验证这个 PR 的正确性 -->

1. ...
2. ...
```

---

## 5. 发布流程（Release）

### 5.1 版本号规则

采用 **SemVer**（语义化版本）：

- `v0.1.0`：Phase 1 完成
- `v0.2.0`：Phase 2 完成
- `v0.3.0`：Phase 3 完成
- `v0.4.0`：Phase 4 完成
- `v1.0.0`：MVP 完整版本

### 5.2 发布步骤

```bash
# 1. 确保 develop 分支稳定
 git checkout develop
 git pull origin develop

# 2. 创建发布分支
 git checkout -b release/v0.1.0

# 3. 更新版本号（README.md、package.json 等）

# 4. 合并到 main
 git checkout main
 git merge release/v0.1.0

# 5. 打标签
 git tag -a v0.1.0 -m "Phase 1: Infrastructure complete"
 git push origin v0.1.0

# 6. 合并回 develop
 git checkout develop
 git merge main
```

---

## 6. 常见问题

### Q: 可以在 main 分支直接修改 README 吗？

**A**: 可以，但建议通过 PR 合并。如果是紧急修复（如错别字），可以直接提交并使用 `docs:` 类型。

### Q: 一个 Task 发现做不完，可以拆分为多个提交吗？

**A**: 可以。只要每个提交都是可编译、可运行的，就符合规范。提交信息可以标注为 `Task-004-part1`、`Task-004-part2`。

### Q: Spec 变更和代码变更可以在同一个提交里吗？

**A**: 不建议。Spec 变更使用 `docs:`，代码变更使用 `feat:` 或 `fix:`，分开提交便于追溯。

### Q: AI 生成的代码需要审查吗？

**A**: 需要。使用 `code-reviewer` Skill 进行自我审查，或人工审查关键模块（如 RAGService、AuthService）。

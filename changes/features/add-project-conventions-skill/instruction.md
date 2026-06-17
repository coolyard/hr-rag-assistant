# Agent 指令：创建 Project Conventions Skill

> 【执行纪律】本指令只有 1 个阶段、3 个 Task。严格按照顺序完成。

---

## 前置阅读

1. `changes/features/add-project-conventions-skill/spec.md`
2. `.github/workflows/ci.yml`
3. `.github/pull_request_template.md`
4. `apps/web/vitest.config.ts`
5. `apps/api/jest.config.ts`
6. `apps/web/playwright.config.ts`
7. `eslint.config.mjs`
8. `package.json`（根目录）
9. `apps/web/src/components/Chat/ChatMessage.tsx`（参考组件模式）
10. `apps/web/src/components/Chat/ChatMessage.module.css`（参考 CSS Modules 模式）
11. `apps/api/prisma/schema.prisma`（参考 Prisma schema 模式）

---

## 阶段 1：编写并部署 SKILL.md

### T-01：审计项目约定

浏览以下内容确认你理解项目约定：

1. Monorepo 布局：`apps/web` + `apps/api`，pnpm workspaces
2. 前端组件：`apps/web/src/components/{Domain}/{Component}.tsx` + 同级 `.module.css`
3. 前端 hooks：`apps/web/src/hooks/use{Name}.ts`
4. 前端 API：`apps/web/src/api/{name}.ts`
5. 后端模块：`apps/api/src/{module}/{module}.module.ts` + `.service.ts` + `.controller.ts`
6. 测试：Vitest（`*.test.tsx`/`*.test.ts`）+ Jest（`*.spec.ts`）+ Playwright（`e2e/specs/*.spec.ts`）
7. Specs 目录：`changes/features/{feature-name}/` 含 spec.md + instruction.md + pr.md
8. 分支命名：`feature/*` / `fix/*`，base 为 `develop`
9. CI：quality job（lint→format:check→test→build）+ e2e job（Playwright）

### T-02：创建 SKILL.md

在 `.codex/skills/project-conventions/` 目录中创建 `SKILL.md`，内容包含以下 8 个章节。

**文件路径**：`.codex/skills/project-conventions/SKILL.md`

**内容模板**：

```markdown
# Project Conventions

> 本 Skill 定义了项目的开发约定和工作流模式。启用后，Codex 将自动遵循这些约定。

---

## 1. 项目结构约定

### Monorepo 布局

```
project-root/
├── apps/
│   ├── web/                  # 前端应用（React + Vite）
│   │   ├── src/
│   │   │   ├── components/   # UI 组件（按领域分目录）
│   │   │   │   └── {Domain}/
│   │   │   │       ├── {Component}.tsx
│   │   │   │       └── {Component}.module.css
│   │   │   ├── hooks/        # 自定义 hooks
│   │   │   ├── pages/        # 页面组件
│   │   │   ├── api/          # API 调用封装
│   │   │   ├── context/      # React Context
│   │   │   ├── utils/        # 工具函数
│   │   │   └── styles/       # 全局样式变量
│   │   ├── e2e/
│   │   │   ├── fixtures/     # 测试基境
│   │   │   ├── mocks/        # API Mock
│   │   │   └── specs/        # E2E 测试
│   │   └── playwright.config.ts
│   └── api/                  # 后端应用（NestJS）
│       ├── src/
│       │   └── {module}/
│       │       ├── {module}.module.ts
│       │       ├── {module}.controller.ts
│       │       ├── {module}.service.ts
│       │       ├── {module}.interface.ts
│       │       └── {module}.service.spec.ts
│       └── prisma/
│           └── schema.prisma
├── changes/
│   └── features/
│       └── {feature-name}/
│           ├── spec.md        # Feature 规格说明
│           ├── instruction.md # Agent 执行指令
│           └── pr.md          # PR 描述模板
├── .github/
│   ├── workflows/ci.yml
│   └── pull_request_template.md
├── package.json               # 根 workspace 配置
├── pnpm-workspace.yaml
├── eslint.config.mjs
└── .prettierrc (或 package.json 中的 prettier 配置)
```

### 文件命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| React 组件 | PascalCase.tsx | `ChatMessage.tsx` |
| CSS Module | 同组件名.module.css | `ChatMessage.module.css` |
| 测试文件 | 同源文件名.test.tsx | `ChatMessage.test.tsx` |
| Hook | use + PascalCase.ts | `useChat.ts` |
| API 模块 | kebab-case.ts | `sse.ts` |
| 后端服务 | kebab-case.service.ts | `rag.service.ts` |
| 后端测试 | kebab-case.service.spec.ts | `rag.service.spec.ts` |
| E2E Spec | kebab-case.spec.ts | `chat.spec.ts` |
| Feature 目录 | add-{description} | `add-conversation-persistence` |

### 目录组织原则

- 组件按**领域**分目录（如 `Chat/`、`Document/`、`Layout/`），不是按类型
- hooks 放在独立的 `hooks/` 目录，不随组件分布
- 每个 feature 的 spec/instruction/pr 放在 `changes/features/{name}/` 下

---

## 2. 技术栈约定

### 前端

| 项目 | 选择 | 版本 |
|------|------|------|
| 框架 | React | 18.x |
| 构建 | Vite | 5.x+ |
| 样式 | CSS Modules | — |
| 测试 | Vitest + Testing Library | 3.x |
| E2E | Playwright | 1.52+ |
| 语言 | TypeScript (strict) | 5.x |

### 后端

| 项目 | 选择 | 版本 |
|------|------|------|
| 框架 | NestJS | 10.x |
| ORM | Prisma | 5.x |
| 数据库 | SQLite (dev) | — |
| 测试 | Jest + ts-jest | 29.x |
| 语言 | TypeScript (strict) | 5.x |

### 共享

| 项目 | 选择 |
|------|------|
| 包管理 | pnpm（workspace） |
| Lint | ESLint（typescript-eslint strict） |
| 格式化 | Prettier |
| CI/CD | GitHub Actions |
| Node | 22 LTS |

### 路径别名

- 前端：`@/` → `apps/web/src/`
- 后端：`@/` → `apps/api/src/`

---

## 3. 组件开发规范

### React 组件模式

```tsx
import { type FC, useCallback, useState } from 'react';
import styles from './MyComponent.module.css';

interface MyComponentProps {
  title: string;
  onAction?: (id: string) => void;
}

export const MyComponent: FC<MyComponentProps> = ({ title, onAction }) => {
  const [state, setState] = useState<string>('');

  const handleClick = useCallback(() => {
    setState('clicked');
    onAction?.(state);
  }, [state, onAction]);

  return (
    <div className={styles.container}>
      <h1>{title}</h1>
      <button onClick={handleClick} type="button">Click</button>
    </div>
  );
};
```

**关键规则**：
- 使用 `type FC` 而非 `React.FC`
- Props 接口以 `{ComponentName}Props` 命名
- 使用 `useCallback` 包裹事件处理函数
- `export const` 导出而非 `export default`
- 条件渲染使用 `&&` 短路求值
- 列表渲染使用 `.map()` 并提供 `key`

### CSS Modules 规则

```css
/* 类名使用 camelCase */
.container {
  display: flex;
  padding: 16px;
}

.title {
  font-size: 1.2rem;
  font-weight: 600;
}

/* 使用 CSS 变量实现主题 */
.container {
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* 动画定义在模块内 */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

**关键规则**：
- 类名使用 camelCase（如 `.messageActions`，不是 `.message-actions`）
- 主题颜色通过 CSS 变量（`var(--xxx)`）引用，定义在 `styles/variables.css`
- 动画定义在每个模块文件内部，不全局共享
- 不使用 CSS-in-JS
- 每个组件一个 `.module.css` 文件，同级存放

### Hooks 开发指南

- 文件名：`use{Name}.ts`
- 使用 `useCallback` / `useMemo` 避免不必要的重渲染
- 返回值使用对象解构：`return { data, isLoading, mutate }`
- 副作用使用 `useEffect` + cleanup 函数

---

## 4. 测试规范

### 单元测试

**前端（Vitest + Testing Library）**：

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('应显示标题', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

**后端（Jest）**：

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();
    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### E2E 测试（Playwright）

```
e2e/
├── fixtures/        # 测试基境
│   ├── auth.ts      # 登录辅助函数
│   └── test-data.ts # Mock 数据
├── mocks/
│   └── api-handlers.ts # API 拦截（page.route）
└── specs/           # 测试用例
    └── {domain}.spec.ts
```

**Mock 策略**：
- E2E 使用 `page.route()` 拦截所有后端 API 请求，返回模拟数据
- 不依赖真实后端服务
- 测试命名：`TC-{MODULE}-{序号}: {描述}`

### 测试覆盖率要求

- 单元测试：核心业务逻辑必须有测试
- E2E 测试：每个用户流程必须有至少一个测试
- CI 中执行全部测试，失败阻止合并

---

## 5. CI/CD 规范

### GitHub Actions 双 Job 结构

```yaml
name: CI
on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop]

jobs:
  quality:        # 代码质量检查
    steps:
      - checkout
      - pnpm setup (version pinned)
      - node setup (22, cache: pnpm)
      - pnpm install
      - prisma generate
      - pnpm lint
      - pnpm format:check
      - pnpm test
      - pnpm build

  e2e:            # E2E 测试（与 quality 并行）
    steps:
      - checkout
      - pnpm + node setup
      - pnpm install
      - playwright install chromium
      - pnpm test:e2e
      - upload playwright-report (on failure)
```

### 提交流程

1. 每个 PR 前本地运行：`pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e`
2. 全部通过后才能 push
3. PR 合并到 `develop`，发布时合并到 `main`

---

## 6. PR 规范

### PR 模板

```markdown
## 变更描述
## 关联 Task
## 验收标准
## Spec 变更
## 测试方式
## 审查重点
```

### 分支命名

- `feature/{description}` — 新功能
- `fix/{description}` — Bug 修复
- `add-{description}` — 工具/基础设施增强

### Review 检查清单

- [ ] 所有测试通过（单元 + E2E）
- [ ] lint 和 format:check 通过
- [ ] 构建成功
- [ ] 审查重点已确认
- [ ] 新增/修改文件符合项目命名规范

---

## 7. Spec-Driven 开发流程

### 三文档工作流

每个 feature 在开发前先创建 `changes/features/{feature-name}/` 目录，包含三个文档：

**1. spec.md** — Feature 规格说明
```markdown
# Feature Spec：{功能名称}
## 1. 需求背景与目标
## 2. 技术方案（含接口变更、组件结构、数据流）
## 3. 实现任务分解（Task ID + 涉及文件）
## 4. 测试用例
## 5. 验收标准
```

**2. instruction.md** — Agent 执行指令
```markdown
# Agent 指令：{功能名称}
> 【执行纪律】本指令包含 N 个 Task，分为 M 个阶段。
## 前置阅读（列出必读文件）
## 阶段 X：{阶段名}（T-XX ~ T-XX）
### 每条指令包含：文件路径 + 具体代码 + 验证命令
## 最终验证（完整检查清单）
```

**3. pr.md** — PR 描述模板
```markdown
## 变更描述
## 关联 Task
## 验收标准
## Spec 变更
## 测试方式
## 审查重点
```

### Spec 编写规范

- `spec.md` 用**自然语言**描述需求，面向人阅读
- `instruction.md` 用**精确的代码和文件路径**，面向 Agent 执行
- `pr.md` 按项目 PR 模板格式，包含验收标准和审查重点

---

## 8. Codex 协作约定

### 验证命令清单

提交前必须运行以下命令，全部通过才能提交：

```bash
pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e
```

### 提交前必检项

- [ ] `pnpm lint` — 0 error
- [ ] `pnpm format:check` — 全部一致
- [ ] `pnpm build` — 前后端构建成功
- [ ] `pnpm test` — 全部单元测试通过
- [ ] `pnpm test:e2e` — 全部 E2E 测试通过

### Agent 指令模板

```
请严格按照 changes/features/{feature-name}/instruction.md 中的 N 个阶段、M 个 Task 依次执行。
完整需求参考 changes/features/{feature-name}/spec.md。
每个阶段完成后运行对应验证命令，全部通过后再进入下一阶段。
最终执行 pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e 全部通过后，
按照 .github/pull_request_template.md 模版和 changes/features/{feature-name}/pr.md 的内容创建 PR。
```
```

### T-03：去业务化检查

编写完成后，搜索 SKILL.md 确保不包含以下业务关键词：HR、RAG、Ollama、年假、报销、考勤、请假、qwen、embedding、向量检索、关键词检索、混合排序

如有发现，替换为通用术语（如 "LLM Service" → "AI Service"，"RAG" → "data retrieval pipeline"）。

### 阶段 1 验证

```bash
wc -l .codex/skills/project-conventions/SKILL.md
# 应 > 300 行

# 确认无业务关键词
rg -i "hr|rag|ollama|年假|报销|考勤|请假|qwen|embedding" .codex/skills/project-conventions/SKILL.md
# 应无输出
```

---

## 最终验证

```bash
pnpm format:check
```

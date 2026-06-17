# Project Conventions

> 本 Skill 定义了项目的开发约定和工作流模式。启用后，Codex 将自动遵循这些约定。
> 适用于 monorepo（pnpm workspace）+ React + NestJS + TypeScript 项目。

---

## 项目结构约定

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
└── .gitignore
```

### 文件命名规范

| 类型         | 命名                       | 示例                           |
| ------------ | -------------------------- | ------------------------------ |
| React 组件   | PascalCase.tsx             | `ChatMessage.tsx`              |
| CSS Module   | 同组件名.module.css        | `ChatMessage.module.css`       |
| 前端单元测试 | 同源文件名.test.tsx        | `ChatMessage.test.tsx`         |
| Hook         | use + PascalCase.ts        | `useChat.ts`                   |
| API 模块     | kebab-case.ts              | `sse.ts`                       |
| 后端服务     | kebab-case.service.ts      | `data.service.ts`              |
| 后端测试     | kebab-case.service.spec.ts | `data.service.spec.ts`         |
| 后端接口     | kebab-case.interface.ts    | `data.interface.ts`            |
| E2E Spec     | kebab-case.spec.ts         | `chat.spec.ts`                 |
| Feature 目录 | add-{description}          | `add-conversation-persistence` |

### 目录组织原则

- 组件按**领域**分目录（如 `Chat/`、`Document/`、`Layout/`），不是按类型
- hooks 放在独立的 `hooks/` 目录，不随组件分布
- 每个 feature 的 spec/instruction/pr 放在 `changes/features/{name}/` 下
- E2E 的 fixtures/mocks/specs 分离

---

## 技术栈约定

### 前端

| 项目 | 选择                         | 备注                     |
| ---- | ---------------------------- | ------------------------ |
| 框架 | React 18.x                   | 函数组件 + Hooks         |
| 构建 | Vite 5.x+                    | 支持路径别名 `@/`        |
| 样式 | CSS Modules                  | 每组件一个 `.module.css` |
| 测试 | Vitest 3.x + Testing Library | `jsdom` 环境             |
| E2E  | Playwright 1.52+             | Chromium headless        |
| 语言 | TypeScript (strict)          | 5.x                      |

### 后端

| 项目 | 选择                | 备注         |
| ---- | ------------------- | ------------ |
| 框架 | NestJS 10.x         | 模块化架构   |
| ORM  | Prisma 5.x          | SQLite (dev) |
| 测试 | Jest 29.x + ts-jest | Node 环境    |
| 语言 | TypeScript (strict) | 5.x          |

### 共享

| 项目   | 选择                                                                    |
| ------ | ----------------------------------------------------------------------- |
| 包管理 | pnpm（workspace）                                                       |
| Lint   | ESLint（`typescript-eslint` strict + `import-x/order` + `react-hooks`） |
| 格式化 | Prettier（统一风格）                                                    |
| CI/CD  | GitHub Actions                                                          |
| Node   | 22 LTS                                                                  |

### 路径别名

- 前端：`@/` → `apps/web/src/`
- 后端：`@/` → `apps/api/src/`

### pnpm Workspace 脚本

```json
{
  "dev": "concurrently -n api,web \"pnpm run dev:api\" \"pnpm run dev:web\"",
  "build": "pnpm --filter web build && pnpm --filter api build",
  "lint": "eslint .",
  "format": "prettier --write \"**/*.{ts,tsx,js,mjs,json,css,html,md}\"",
  "format:check": "prettier --check \"**/*.{ts,tsx,js,mjs,json,css,html,md}\"",
  "test": "pnpm --recursive test",
  "test:e2e": "pnpm --filter web test:e2e"
}
```

---

## 组件开发规范

### React 组件模式

```tsx
import { type FC, useCallback, useEffect, useState } from 'react';
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
      <h1 className={styles.title}>{title}</h1>
      <button className={styles.button} onClick={handleClick} type="button">
        操作
      </button>
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
- 列表渲染使用 `.map()` 并提供稳定的 `key`
- 事件处理器以 `handle{Event}` 命名
- prop 回调以 `on{Event}` 命名

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
  border: 1px solid var(--border-color);
}

/* 动画定义在模块内 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animated {
  animation: fadeIn 0.2s ease;
}
```

**关键规则**：

- 类名使用 camelCase（如 `.messageActions`，不是 `.message-actions`）
- 主题颜色通过 CSS 变量引用，定义在 `styles/variables.css`
- 动画定义在每个模块文件内部，不全局共享
- 不使用 CSS-in-JS
- 每个组件一个 `.module.css` 文件，同级存放
- 过渡动画使用 `transition: all 0.2s ease`
- 悬停效果使用 `:hover` 伪类

### Hooks 开发指南

- 文件名：`use{Name}.ts`
- 使用 `useCallback` / `useMemo` 避免不必要的重渲染
- 返回值使用对象解构：`return { data, isLoading, mutate }`
- 副作用使用 `useEffect` + cleanup 函数
- AbortController 用于取消异步操作
- 使用 `useRef` 避免闭包陷阱

### 布局组件模式

```tsx
import { type FC } from 'react';
import styles from './Layout.module.css';

export const Layout: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={styles.layout}>
    <aside className={styles.sidebar}>...</aside>
    <main className={styles.main}>{children}</main>
  </div>
);
```

---

## 测试规范

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

  it('点击按钮应触发回调', () => {
    const onAction = vi.fn();
    render(<MyComponent title="Test" onAction={onAction} />);
    screen.getByRole('button').click();
    expect(onAction).toHaveBeenCalled();
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

**目录结构**：

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
- 测试不依赖数据库状态

**测试用例命名**：`TC-{MODULE}-{序号}: {中文描述}`

**Playwright 配置关键点**：

```typescript
export default defineConfig({
  testDir: './e2e/specs',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 测试覆盖率要求

- 单元测试：核心业务逻辑必须有测试
- E2E 测试：每个用户流程必须有至少一个测试
- CI 中执行全部测试，失败阻止合并

---

## CI/CD 规范

### GitHub Actions 双 Job 结构

```yaml
name: CI
on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop]

jobs:
  quality: # 代码质量检查
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: '<pinned-version>'
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install
      - name: Generate Prisma client
        run: npx prisma generate
        working-directory: apps/api
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm test
      - run: pnpm build

  e2e: # E2E 测试（与 quality 并行）
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: '<pinned-version>'
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install
      - name: Install Playwright Chromium
        run: pnpm --filter web exec playwright install chromium
      - name: Run Playwright tests
        run: pnpm --filter web test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 7
```

### 提交流程

1. 每个 PR 前本地运行全部验证
2. 全部通过后才能 push
3. PR 合并到 `develop`，发布时合并到 `main`

---

## PR 规范

### PR 模板

```markdown
## 变更描述

<!-- 描述这个 PR 做了什么 -->

## 关联 Task

<!-- 列出完成的 Task 编号 -->

- Task-XXX: ...

## 验收标准

<!-- 列出验收通过的检查项 -->

- [ ] ...

## Spec 变更

<!-- 如果有 Spec 变更，列出变更内容 -->

- ...

## 测试方式

<!-- 如何验证这个 PR 的正确性 -->

1. ...
2. ...

## 审查重点

<!-- 需要 reviewer 特别关注的问题或代码 -->
```

### 分支命名

- `feature/{description}` — 新功能
- `fix/{description}` — Bug 修复
- `codex/{description}` — Codex Agent 生成的分支

### Review 检查清单

- [ ] 所有测试通过（单元 + E2E）
- [ ] lint 和 format:check 通过
- [ ] 构建成功
- [ ] 审查重点已确认
- [ ] 新增/修改文件符合项目命名规范

---

## Spec-Driven 开发流程

### 三文档工作流

每个 feature 在开发前先创建 `changes/features/{feature-name}/` 目录，包含三个文档：

**1. spec.md** — Feature 规格说明

```markdown
# Feature Spec：{功能名称}

> 本 Feature ...
> 对应模块：...
> 状态：待实现

## 1. 需求背景与目标

### 1.1 背景

### 1.2 目标

### 1.3 明确不做

## 2. 技术方案

### 2.1 数据流设计

### 2.2 接口变更

### 2.3 组件结构

## 3. 实现任务分解

| Task ID | 描述 | 涉及文件 |
| ------- | ---- | -------- |

## 4. 测试用例

## 5. 验收标准
```

**2. instruction.md** — Agent 执行指令

````markdown
# Agent 指令：{功能名称}

> 【执行纪律】本指令包含 N 个 Task，分为 M 个阶段。严格按照阶段顺序逐一完成。

## 前置阅读（按顺序读）

1. `changes/features/{name}/spec.md`
2. `apps/web/src/...`（相关源文件）

## 阶段 1：{阶段名}（T-XX ~ T-XX）

### T-XX：{Task 描述}

#### 编辑 `{文件路径}`

（精确代码 + 插入位置）

### 阶段 X 验证

```bash
验证命令
```
````

## 最终验证

```bash
pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e
```

````

**3. pr.md** — PR 描述模板

```markdown
## 变更描述
## 关联 Task
## 验收标准
## Spec 变更
## 测试方式
## 审查重点
````

### Spec 编写规范

- `spec.md` 用**自然语言**描述需求，面向人阅读
- `instruction.md` 用**精确的代码和文件路径**，面向 Agent 执行，包含具体的 `sed`/`python` 命令
- `pr.md` 按项目 PR 模板格式
- instruction.md 中每个阶段结束后包含验证命令
- 最终验证始终包含完整的 `pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e`

---

## Codex 协作约定

### 验证命令清单

提交前必须运行以下命令，**全部通过才能提交**：

```bash
pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e
```

### 提交前必检项

- [ ] `pnpm lint` — 0 error, 0 warning
- [ ] `pnpm format:check` — All matched files use Prettier code style
- [ ] `pnpm build` — 前后端均构建成功
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

### 常用命令速查

```bash
# 开发
pnpm dev                  # 启动前后端
pnpm --filter web dev     # 仅前端
pnpm --filter api start:dev  # 仅后端

# 构建
pnpm build                # 全量构建

# 测试
pnpm test                 # 单元测试
pnpm --filter web test:e2e  # E2E 测试
pnpm --filter web exec playwright test e2e/specs/{name}.spec.ts  # 单个 E2E

# 代码质量
pnpm lint                 # ESLint 检查
pnpm format:check         # Prettier 格式检查
pnpm format               # Prettier 自动格式化

# 数据库
cd apps/api && npx prisma db push   # 同步 schema
cd apps/api && npx prisma generate  # 生成 client
```

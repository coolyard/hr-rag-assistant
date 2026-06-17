# Feature Spec：Project Conventions Skill

> 本 Feature 为项目创建 `project-conventions` Codex Skill，将当前项目的开发模式、规范和工作流抽象为可复用的知识文档。以后在新项目中使用这个 Skill，Codex 可以自动遵循相同的开发约定。
>
> 对应模块：无（纯文档/Skill）
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前项目经过多轮迭代积累了成熟的开发模式：
- Monorepo（pnpm workspace）
- CSS Modules
- 前后端分离（React + NestJS）
- Spec-driven development（spec → instruction → pr 三文档工作流）
- CI/CD（lint + format:check + test + build + e2e）
- PR 模版化
- 分支命名规范
- TypeScript strict mode

这些模式是"可迁移的开发资产"。如果把它们抽象为 Skill，在新项目初始化时直接启用，可以大幅减少"从零配置到产出第一版代码"的时间。

### 1.2 目标

1. 创建 `.codex/skills/project-conventions/SKILL.md`，包含完整开发规范
2. 内容涵盖：项目结构、命名规范、组件模式、测试策略、CI/CD、PR 流程、spec-driven 开发流程
3. 完全去业务化——不包含 HR、RAG、Ollama 等业务关键词
4. 可被任何新项目直接复用

### 1.3 Skill 内容结构

```
SKILL.md
├── 1. 项目结构约定
│   ├── Monorepo 布局
│   ├── 文件命名规范
│   └── 目录组织原则
├── 2. 技术栈约定
│   ├── 前端（React/Vite/CSS Modules）
│   ├── 后端（NestJS/Prisma）
│   └── 共享（TypeScript/ESLint/Prettier）
├── 3. 组件开发规范
│   ├── React 组件模式
│   ├── CSS Modules 规则
│   └── Hooks 开发指南
├── 4. 测试规范
│   ├── 单元测试（Vitest/Jest）
│   ├── E2E 测试（Playwright）
│   └── Mock 策略
├── 5. CI/CD 规范
│   ├── GitHub Actions 双 Job 结构
│   ├── 提交流程
│   └── 前置验证要求
├── 6. PR 规范
│   ├── PR 模板结构
│   ├── 分支命名规则
│   └── Review 检查清单
├── 7. Spec-Driven 开发流程
│   ├── spec.md 编写规范
│   ├── instruction.md 编写规范
│   └── pr.md 编写规范
└── 8. Codex 协作约定
    ├── 验证命令清单
    ├── 提交前必检项
    └── Agent 指令模板
```

---

## 2. 实现任务分解

| Task ID | 描述 |
|---------|------|
| T-01 | 审计并提取项目所有约定（命名、结构、配置） |
| T-02 | 编写 SKILL.md（放置在 `.codex/skills/project-conventions/`） |
| T-03 | 去业务化检查——确保 SKILL.md 中无任何业务关键词 |

---

## 3. 验收标准

- [ ] `.codex/skills/project-conventions/SKILL.md` 文件存在
- [ ] 覆盖 8 个约定维度（项目结构、技术栈、组件、测试、CI/CD、PR、Spec-Driven、Codex 协作）
- [ ] 完全去业务化——不包含 HR、RAG、Ollama、年假、报销、考勤等业务关键词
- [ ] 文件可读性强，有代码示例
- [ ] `pnpm format:check` 不影响

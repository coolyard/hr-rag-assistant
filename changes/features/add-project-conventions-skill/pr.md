## 变更描述

创建 `project-conventions` Codex Skill，将当前项目积累的开发模式、规范和工作流抽象为可复用的知识文档。Skill 涵盖 8 个维度：项目结构、技术栈、组件开发、测试、CI/CD、PR 规范、Spec-Driven 开发流程、Codex 协作约定。

以后在新项目中使用这个 Skill，Codex 可以自动遵循相同的开发约定，大幅减少项目初始化时间。

## 关联 Task

- **T-01**: 审计并提取项目所有约定
- **T-02**: 编写 SKILL.md（580 行，8 个章节）
- **T-03**: 去业务化检查（确认无业务关键词）

## 验收标准

- [ ] `.codex/skills/project-conventions/SKILL.md` 文件存在
- [ ] 覆盖 8 个约定维度
- [ ] 完全去业务化——不包含任何业务关键词
- [ ] 文件可读性强，有代码示例
- [ ] `pnpm format:check` 通过

## Spec 变更

- 新增：`changes/features/add-project-conventions-skill/spec.md`
- 新增：`changes/features/add-project-conventions-skill/instruction.md`
- 新增：`.codex/skills/project-conventions/SKILL.md`

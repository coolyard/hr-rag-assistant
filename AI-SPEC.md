# AI Spec 开发规范

## Spec-Driven 三文档工作流

每个新功能在 `changes/features/{feature-name}/` 创建三个文档：

### 1. spec.md — 需求规格

- 需求背景与目标
- 技术方案（接口变更、组件结构、数据流）
- 实现任务分解（Task ID + 涉及文件）
- 测试用例
- 验收标准

### 2. instruction.md — Agent 执行指令

- 分阶段 Task 列表
- 每个 Task：具体文件路径 + 代码片段 + 验证命令
- 最终验证：`pnpm lint && format:check && build && test && test:e2e`

### 3. pr.md — PR 描述模板

- 变更描述 / 关联 Task / 验收标准 / Spec 变更 / 测试方式 / 审查重点

## 已完成的 Feature

| Feature                   | PR  |
| ------------------------- | --- |
| 核心单元测试              | #12 |
| Playwright E2E 测试       | #13 |
| 思考过程展示              | #14 |
| 对话持久化 + 列表         | #15 |
| 高级流式 UX               | #16 |
| Tool Use 可视化           | #17 |
| React 生产级模式          | #18 |
| RAG 检索可视化            | #19 |
| Project Conventions Skill | #20 |
| RAG 评估闭环              | #21 |

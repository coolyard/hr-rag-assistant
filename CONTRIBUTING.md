# 贡献指南

## 开发环境

- Node.js 22 LTS
- pnpm 10
- Ollama (qwen2.5:7b-instruct + nomic-embed-text)

## 开发流程

1. Fork 仓库，从 `develop` 创建 feature 分支
2. 大功能先写 spec.md → instruction.md → pr.md（见 `changes/features/`）
3. 小步提交，每个阶段完成后验证
4. Push 后创建 PR 到 `develop`
5. Code Review 通过后合并

## 提交前验证

```bash
pnpm lint          # ESLint 0 error
pnpm format:check  # Prettier 全部一致
pnpm build         # 前后端构建
pnpm test          # 81 个单元测试
pnpm test:e2e      # 45 个 E2E 测试
```

## 分支命名

- `feature/{name}` — 新功能
- `fix/{name}` — 修复
- `codex/{name}` — Codex Agent 生成

## PR 规范

提交 PR 时请包含：

- 变更描述
- 关联 Task
- 验收标准
- 测试方式
- 审查重点

## Release 流程

- `develop` → `main` PR 由 GitHub Action 自动创建（每周一 / 手动触发）
- 合并后 Release Please 自动生成 Release + Changelog
- feat 提交 → minor 版本递增，fix → patch，major 手动触发

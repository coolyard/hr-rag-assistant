# AI 编码指南（Codex / Agent）

## 核心原则

1. **验证先行** — 每次代码修改后立即运行验证命令，全部通过再提交
2. **Spec-Driven** — 大功能先写 spec.md → instruction.md → pr.md
3. **小步提交** — 每个阶段完成后独立 commit
4. **完全验证** — 提交前必须通过全部检查

## 提交前必检

```bash
pnpm lint          # ESLint 0 error
pnpm format:check  # Prettier 全部一致
pnpm build         # 前后端构建成功
pnpm test          # 全部单元测试通过
pnpm test:e2e      # 全部 E2E 测试通过
```

## Agent 指令模板

```
请严格按照 changes/features/{feature-name}/instruction.md 中的
N 个阶段、M 个 Task 依次执行。完整需求参考 spec.md。
每个阶段完成后运行对应验证命令，全部通过后再进入下一阶段。
最终执行 pnpm lint && pnpm format:check && pnpm build &&
pnpm test && pnpm test:e2e 全部通过后，创建 PR。
```

## NestJS 模块依赖注意

添加新模块时，确保：

1. 新模块的 `imports` 包含所有依赖模块（RagModule, LLMModule, PrismaModule）
2. 在 `app.module.ts` 中注册
3. 启动验证 `pnpm dev` 确认无依赖注入错误

## Playwright E2E 注意

- Mock 使用 `page.route()` 拦截 API
- 测试页面标题/按钮用 `getByText()`, 标题用 `getByRole('heading')`
- 严格模式下多匹配会导致失败，用 `.first()` 或精确选择器
- `page.goto()` 会重载页面丢失 mock，用 `networkidle` 等待
- e2e 目录下的 `as const` 会被 Playwright 转换器正确处理

## 测试文件命名

| 类型     | 命名           | 示例                   |
| -------- | -------------- | ---------------------- |
| 前端单元 | `*.test.ts(x)` | `ChatMessage.test.tsx` |
| 后端单元 | `*.spec.ts`    | `rag.service.spec.ts`  |
| E2E      | `*.spec.ts`    | `chat.spec.ts`         |

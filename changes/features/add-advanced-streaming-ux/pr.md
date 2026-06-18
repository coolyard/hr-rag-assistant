## 变更描述

为 Chat 补全高级流式交互能力：停止生成按钮、重新生成消息、Token 使用量展示。打磨流式 AI Chat 的用户体验，展示对 LLM API 成本模型的认知。

## 关联 Task

- **T-01**: 后端 done chunk 增加 `promptTokens`/`completionTokens`
- **T-02**: 前端类型 + `useChat` 扩展（token 字段 + `stopGeneration`）
- **T-03**: 停止生成按钮（ChatPage 输入区）
- **T-04**: 重新生成按钮（assistant 消息底部）
- **T-05**: Token 计数显示（消息底部 + 总计）
- **T-06**: E2E 测试：3 个 streaming UX 用例

## 验收标准

### 后端
- [ ] done chunk 包含 `promptTokens` 和 `completionTokens` 字段
- [ ] `cd apps/api && npx tsc --noEmit` 通过

### 前端
- [ ] 流式生成中显示"停止"按钮，点击中止并保留已生成内容
- [ ] 每条 assistant 消息底部显示"重新生成"按钮
- [ ] 重新生成后旧回答被替换，新回答正确渲染
- [ ] 消息底部显示 `~XXX tokens`
- [ ] 消息列表底部显示本轮 Prompt/Completion/总计 token 数
- [ ] 停止后输入区恢复可用

### E2E 测试（新增 3 个）
- [ ] TC-STRM-01: 停止生成
- [ ] TC-STRM-02: 重新生成
- [ ] TC-STRM-03: Token 计数显示

### 回归验证
- [ ] `pnpm test` 全部通过
- [ ] `pnpm test:e2e` 32 个测试通过（29 原有 + 3 新增）
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

## Spec 变更

- 新增：`changes/features/add-advanced-streaming-ux/spec.md`、`instruction.md`
- 修改：`rag.interface.ts`、`ask.interface.ts`（promptTokens/completionTokens）
- 修改：`rag.service.ts`（done chunk 计算 token）
- 修改：`ask.controller.ts`（传递 token 字段）
- 修改：`sse.ts`（AskStreamChunk 扩展）
- 修改：`useChat.ts`（Message 扩展 + stopGeneration + regenerate）
- 修改：`ChatPage.tsx`（停止按钮 + token 总计）
- 修改：`ChatMessage.tsx`（重新生成按钮 + token 信息）
- 修改：`ChatMessage.module.css`（新按钮样式）
- 新增：`apps/web/e2e/specs/streaming-ux.spec.ts`

## 审查重点

- Token 估算公式（`length / 2`）对中英文混合场景的准确性
- 停止生成后 `loadingRef.current` 是否正确重置
- 重新生成时 message 顺序是否正确（需找到对应用户消息）
- `stopGeneration` 的 abort 处理是否与现有 abortRef 逻辑一致

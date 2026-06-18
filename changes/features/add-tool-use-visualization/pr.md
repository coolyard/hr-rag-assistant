## 变更描述

为 Chat 增加 Agent 工具调用（Function Calling）能力。后端内置 3 个预定义工具（申请年假、查询报销、查询加班），通过触发词检测模拟模型决策调用工具；前端新增 `ToolCallCard` 组件，支持参数预览、确认/取消交互和执行结果展示。展示 AI Agent 前端范式的核心理解。

## 关联 Task

- **T-01**: 后端类型：`StreamChunk`/`AskStreamChunk` 新增 `ToolCallStart`/`ToolResult`
- **T-02**: 后端工具注册表 + 3 个 mock 工具（`tool/` 目录）
- **T-03**: `rag.service.ts` 增加触发词检测 + tool call 模拟
- **T-04**: `ask.controller.ts` 新增 `/api/tool/execute` 端点
- **T-05**: 前端类型：`sse.ts`/`useChat.ts` 扩展 Message 和 chunk 类型
- **T-06**: 前端组件：`ToolCallCard` 组件（状态机 + 确认交互）
- **T-07**: 前端 `ChatMessage.tsx` 扩展渲染 toolCall/toolResult 消息
- **T-08**: E2E Mock + 测试：3 个 tool use 测试用例

## 验收标准

### 后端
- [ ] `StreamChunk`/`AskStreamChunk` 含 `ToolCallStart`/`ToolResult` 类型
- [ ] `ToolRegistryService` 注册 3 个触发词工具
- [ ] `rag.service.ts` 检测到"申请年假"/"报销"/"加班"时发出 `toolCallStart` chunk
- [ ] `POST /api/tool/execute` 端点返回工具执行结果
- [ ] `cd apps/api && npx tsc --noEmit` 通过

### 前端
- [ ] `Message` 支持 `role: 'toolCall' | 'toolResult'`
- [ ] `useChat` 处理 `toolCallStart` chunk 并创建 toolCall 消息
- [ ] `ToolCallCard` 组件渲染参数预览 + 确认/取消按钮
- [ ] 确认后调用 `/api/tool/execute`，完成后显示结果
- [ ] 取消后不继续生成回答
- [ ] `ChatMessage` 正确分发 toolCall/toolResult/assistant 渲染

### E2E 测试（新增 3 个）
- [ ] TC-TOOL-01: 工具调用卡片渲染
- [ ] TC-TOOL-02: 确认工具调用
- [ ] TC-TOOL-03: 取消工具调用

### 回归验证
- [ ] `pnpm test` 全部通过
- [ ] `pnpm test:e2e` 32 个测试通过（29 原有 + 3 新增）
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

## Spec 变更

- 新增：`changes/features/add-tool-use-visualization/spec.md`、`instruction.md`
- 修改：`rag.interface.ts`、`ask.interface.ts`（ToolCallStart/ToolResult）
- 新增：`apps/api/src/tool/`（tool 注册表 + mock 实现）
- 修改：`rag.service.ts`（触发词检测）
- 修改：`ask.controller.ts`（tool/execute 端点）
- 修改：`sse.ts`、`useChat.ts`（类型扩展）
- 新增：`ToolCallCard.tsx` + `.module.css`
- 修改：`ChatMessage.tsx`（toolCall/toolResult 渲染）
- 新增：`apps/web/e2e/specs/tool-use.spec.ts`

## 审查重点

- 触发词检测是否误触发（如"我不想请假"也匹配"请假"）
- `ToolCallCard` 确认后 SSE 流如何恢复（当前方案是确认后不恢复，需评估是否够用）
- `useChat` 中 toolCall 消息的 `status` 是否正确设置为 `complete`
- E2E 测试中 mock SSE 的 toolCallStart 发送时机是否正确

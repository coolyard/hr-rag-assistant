## 变更描述

为 Chat 聊天功能增加 AI 思考过程展示。后端在 SSE 流中新增 `reasoning` 字段，在各 RAG 检索分析阶段（向量检索 → 关键词匹配 → 结果合并 → 个人数据注入 → LLM 生成）发送思考内容；前端新增可折叠的"思考过程"区域，思考中默认展开实时显示，完成后自动折叠。参考 ChatGPT / DeepSeek / Claude 等产品的思考过程 UI 设计。

## 关联 Task

- **T-01**: 后端接口层：`StreamChunk` / `AskStreamChunk` 增加 `reasoning` 字段
- **T-02**: 后端业务层：`rag.service.ts` orchestrate 各阶段 yield reasoning
- **T-03**: 后端传输层：`ask.controller.ts` 传递 `reasoning` 到 SSE
- **T-04**: 前端类型/Hook：`sse.ts` / `useChat.ts` 增加 reasoning 支持
- **T-05**: 前端组件：`ChatMessage.tsx` 新增 ThinkingSection 可折叠组件
- **T-06**: 前端样式：`ChatMessage.module.css` 新增思考过程样式
- **T-07**: E2E Mock 更新：`test-data.ts` / `api-handlers.ts` 增加 reasoning mock
- **T-08**: E2E 测试新增：5 个思考过程测试用例

## 验收标准

### 后端

- [ ] `StreamChunk` 和 `AskStreamChunk` 接口包含 `reasoning?: string` 字段
- [ ] `rag.service.ts` orchestrate 在检索/分析各阶段 yield reasoning 内容
- [ ] `ask.controller.ts` 将 `chunk.reasoning` 传递到 SSE 响应的 `data` JSON 中
- [ ] 无 reasoning 内容时，不影响现有 SSE 流（向后兼容）
- [ ] `cd apps/api && npx tsc --noEmit` 编译通过

### 前端

- [ ] `sse.ts` 的 `AskStreamChunk` 含 `reasoning?: string` 字段
- [ ] `useChat.ts` 的 `Message` 接口含 `reasoning?: string` 字段
- [ ] `useChat.ts` 的 `sendMessage` 正确处理 `chunk.reasoning` 并累积到消息
- [ ] `ChatMessage.tsx` 渲染可折叠 ThinkingSection 组件
- [ ] 思考中默认展开，完成后自动折叠（3 秒延迟）
- [ ] 点击头部可切换展开/折叠状态
- [ ] 无 reasoning 内容时不渲染思考区域
- [ ] 视觉风格与设计系统一致（变量、间距、字号、圆角）
- [ ] 亮/暗主题下显示正常

### E2E 测试（新增 5 个）

- [ ] TC-REASON-01: 思考过程区域渲染
- [ ] TC-REASON-02: 思考过程内容不为空（含"向量"或"检索"关键词）
- [ ] TC-REASON-03: 思考完成后自动折叠
- [ ] TC-REASON-04: 点击展开/折叠切换
- [ ] TC-REASON-05: 思考过程不影响现有功能（Markdown、来源引用、猜你想问均正常）

### 回归验证

- [ ] `pnpm test` — 全部单元测试通过
- [ ] `pnpm test:e2e` — 全部 30 个 E2E 测试通过（25 原有 + 5 新增）
- [ ] `pnpm lint` — 0 error
- [ ] `pnpm format:check` — 0 warning
- [ ] `pnpm build` — 构建成功

## Spec 变更

- 新增：`changes/features/add-thinking-process-display/spec.md`（Feature Spec）
- 新增：`changes/features/add-thinking-process-display/instruction.md`（Agent 执行指令）
- 修改：`apps/api/src/rag/rag.interface.ts`（StreamChunk 增加 reasoning）
- 修改：`apps/api/src/ask/ask.interface.ts`（AskStreamChunk 增加 reasoning）
- 修改：`apps/api/src/rag/rag.service.ts`（orchestrate 各阶段 yield reasoning）
- 修改：`apps/api/src/ask/ask.controller.ts`（传递 reasoning 到 SSE）
- 修改：`apps/web/src/api/sse.ts`（AskStreamChunk 增加 reasoning）
- 修改：`apps/web/src/hooks/useChat.ts`（Message 增加 reasoning，处理 reasoning chunk）
- 修改：`apps/web/src/components/Chat/ChatMessage.tsx`（新增 ThinkingSection 组件）
- 修改：`apps/web/src/components/Chat/ChatMessage.module.css`（新增思考过程样式）
- 修改：`apps/web/e2e/fixtures/test-data.ts`（新增 MOCK_REASONING_CHUNKS）
- 修改：`apps/web/e2e/mocks/api-handlers.ts`（buildSSEResponse 加入 reasoning）
- 新增：`apps/web/e2e/specs/thinking.spec.ts`（5 个思考过程 E2E 测试）

## 测试方式

1. `pnpm install` — 安装依赖
2. `cd apps/web && npx playwright install chromium && cd ../..`
3. `pnpm test:e2e` — 运行全部 30 个 E2E 测试
4. `pnpm test` — 运行全部单元测试
5. `pnpm lint && pnpm format:check && pnpm build` — 确保无回归

## 审查重点

- reasoning 字段在 SSE 流中的顺序：reasoning chunks 应在内容 chunks 之前发送
- ThinkingSection 组件的自动折叠 3 秒延迟是否合理，是否会因为回答很快完成而跳过折叠
- `useChat.ts` 中 reasoning 累积使用 `?? '' + chunk.reasoning!` 的空值合并是否正确处理
- E2E 测试中 `page.waitForTimeout(4000)` 硬编码等待是否足够稳定（取决于 Mock 响应速度）
- 思考过程区域的 CSS `max-height: 600px` 是否足够容纳完整推理内容
- 不使用 lucide 图标的合理性（用 Unicode ▸/▾ 替代，减少依赖）

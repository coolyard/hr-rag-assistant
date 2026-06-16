## 变更描述

为每条 AI 回答新增"查看检索详情"按钮，点击后从右侧弹出抽屉面板，可视化展示 RAG 检索全链路：
1. **相似度条形图**：Recharts BarChart 横向对比各文档相似度分数
2. **检索来源对比**：向量检索 vs 关键词检索的命中数和贡献占比（彩色进度条）
3. **检索过程**：思考过程文本预览（reasoning）
4. 支持 Esc / 点击遮罩 / ✕ 关闭

把"黑盒 RAG"变成"可解释 AI"，面试时主动展示检索质量，引导面试官看你的核心 pipeline。

## 关联 Task

- **T-01**: 后端类型：`StreamChunk`/`AskStreamChunk` 新增 `RetrievalDetail` / `SourceItem`
- **T-02**: 后端业务：`rag.service.ts` done chunk 构建 `retrievalDetail`
- **T-03**: 后端传输：`ask.controller.ts` 传递 `retrievalDetail`
- **T-04**: 前端类型：`sse.ts`/`useChat.ts` 扩展
- **T-05**: 前端依赖：安装 recharts
- **T-06**: `RetrievalPanel` 抽屉 + Recharts 图表
- **T-07**: `ChatMessage.tsx` 加"查看检索详情"按钮
- **T-08**: E2E Mock + 测试：3 个 retrieval 用例

## 验收标准

### 后端
- [ ] `StreamChunk` / `AskStreamChunk` 含 `RetrievalDetail` + `SourceItem` 类型
- [ ] done chunk 包含 `retrievalDetail`（vectorCount / keywordCount / vectorSources / keywordSources）
- [ ] `cd apps/api && npx tsc --noEmit` 通过

### 前端
- [ ] `Message.retrievalDetail` 正确存储
- [ ] 每条有 sources 的 assistant 消息底部有"查看检索详情"按钮
- [ ] 点击打开抽屉：相似度 Recharts 图表 + 检索来源对比 + 检索过程文本
- [ ] 相似度条形图正确渲染（horizontal BarChart，Y 轴 = 文档名，X 轴 = 百分比）
- [ ] 检索来源对比：2 个进度条分别显示向量/关键词命中数
- [ ] 支持 3 种关闭方式：✕ / 遮罩 / Esc
- [ ] 关闭后 body overflow 恢复

### E2E 测试（新增 3 个）
- [ ] TC-RETR-01: 按钮渲染
- [ ] TC-RETR-02: 打开抽屉，图表和来源对比可见
- [ ] TC-RETR-03: 点击遮罩关闭

### 回归验证
- [ ] `pnpm test` 全部通过
- [ ] `pnpm test:e2e` 41 个测试通过（38 原有 + 3 新增）
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

## Spec 变更

- 新增：`changes/features/add-rag-retrieval-visualization/spec.md`、`instruction.md`
- 修改：`rag.interface.ts`（新增 `RetrievalDetail`、`SourceItem`）
- 修改：`ask.interface.ts`（`AskStreamChunk` 新增 `retrievalDetail`）
- 修改：`rag.service.ts`（done chunk 新增 `retrievalDetail`）
- 修改：`ask.controller.ts`（传递 `retrievalDetail`）
- 修改：`sse.ts`（前端 `AskStreamChunk` 扩展）
- 修改：`useChat.ts`（`Message` 类型 + done chunk 处理）
- 修改：`apps/web/package.json`（新增 recharts 依赖）
- 新增：`RetrievalPanel.tsx` + `.module.css`
- 修改：`ChatMessage.tsx`（新增按钮 + state + RetrievalPanel 渲染）
- 修改：`ChatMessage.module.css`（如需要新增按钮样式——复用已有 `.actionButton`）
- 新增：`apps/web/e2e/specs/retrieval.spec.ts`
- 修改：`test-data.ts`（`MOCK_RETRIEVAL_DETAIL`）
- 修改：`api-handlers.ts`（done chunk 增加 `retrievalDetail`）

## 审查重点

- `rag.service.ts` 中 `vectorResults` / `keywordResults` 变量作用域：当前在 `try` 块内声明，`retrievalDetail` 需要在其后的作用域访问，需要提升变量声明
- Recharts `ResponsiveContainer` 的父容器必须有明确高度（使用 `Math.max(chartData.length * 40, 120)` 动态计算）
- `RetrievalPanel` 用 `createPortal` 渲染到 `document.body`，确保 z-index 不被其他元素遮挡
- CSS 中 Vector 和 Keyword 进度条的颜色需要有足够对比度（蓝色 accent-color + 绿色 #34d399）
- 不带 sources 的消息不应显示"查看检索详情"按钮（条件判定 `message.sources?.length > 0`）

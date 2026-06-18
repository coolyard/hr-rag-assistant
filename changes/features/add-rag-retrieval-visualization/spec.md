# Feature Spec：RAG 检索可视化面板

> 本 Feature 为每条 AI 回答新增"查看检索详情"按钮，点击后从右侧弹出抽屉面板，可视化展示 RAG 检索全链路：文档相似度条形图、向量 vs 关键词贡献对比、最终 prompt 预览。把"黑盒 RAG"变成"可解释 AI"。
>
> 对应模块：chat-spec.md、api-spec.md

---

## 1. 需求背景与目标

### 1.1 背景

当前项目有一个完整的 RAG pipeline（向量检索 → 关键词匹配 → 混合排序 → LLM 生成），但面试官看不到。现有的 `SourceCitation`（参考来源）以卡片列表形式展示在消息底部，无法直观回答以下面试必问问题：

- "你怎么知道检索到的文档是对的？"
- "向量检索和关键词检索各自贡献了多少？"
- "最终发给 LLM 的 prompt 长什么样？"

### 1.2 目标

1. **抽屉面板**：点击消息底部的"查看检索详情" → 右侧滑出抽屉，半屏覆盖
2. **相似度条形图**：展示每条检索结果的 similarity 分数（用 Recharts）
3. **检索来源对比**：向量检索 vs 关键词检索的命中数和贡献占比
4. **Prompt 预览**：展示最终发给 LLM 的完整 prompt（代码块格式，可滚动）

### 1.3 明确不做

- 不做检索过程的动画回放（v1 仅展示结果）
- 不做实时检索过程可视化（v1 仅展示最终结果）
- 不做多轮对话的检索历史对比（v1 仅当前消息）
- 不接入 Recharts 交互能力（v1 静态图表，不带 tooltip hover）

---

## 2. 技术方案

### 2.1 数据流

```
后端 rag.orchestrate()
  ↓ done chunk（已有 sources + 新增 retrievalDetail）
{
  sources: SourceCitation[],
  retrievalDetail: {
    vectorCount: 2,
    keywordCount: 2,
    vectorSources: [...],   // 向量检索到的原始结果
    keywordSources: [...],  // 关键词检索到的原始结果
  }
}
  ↓ SSE
  ↓
前端 Message 扩展
  retrievalDetail?: RetrievalDetail
  ↓
RetrievalPanel 抽屉组件
  ├── 相似度条形图（Recharts BarChart）
  ├── 检索来源对比（左侧向量 / 右侧关键词）
  └── Prompt 预览（<pre><code>）
```

### 2.2 接口变更

#### StreamChunk / AskStreamChunk（done chunk 新增字段）

```typescript
export interface SourceItem {
  documentTitle: string;
  similarity: number;
  source: 'vector' | 'keyword';
}

export interface RetrievalDetail {
  vectorCount: number;
  keywordCount: number;
  mergedCount: number;
  vectorSources: SourceItem[];
  keywordSources: SourceItem[];
}
```

`done` chunk 中新增 `retrievalDetail?: RetrievalDetail`。

#### Message（前端 hook）

```typescript
export interface Message {
  // ... 现有字段不变
  retrievalDetail?: RetrievalDetail;
}
```

### 2.3 组件结构

```
ChatMessage (assistant 分支，底部操作按钮行)
  ...
  <button>📊 查看检索详情</button>    ← 新增，点击触发抽屉
  ...
  ↓
RetrievalPanel（独立组件，Portal 渲染到 body）
  ├── 遮罩层（半透明黑色，点击关闭）
  └── 抽屉容器（右侧滑入，宽度 480px，高度 100vh）
      ├── 头部：标题"检索详情" + 关闭按钮（✕）
      ├── Section 1：相似度对比
      │   ├── 标题："文档相似度"
      │   └── Recharts <BarChart>（横条图，每个 source 一条）
      ├── Section 2：检索来源对比
      │   ├── 标题："检索来源贡献"
      │   ├── 向量检索：N 条（蓝色条，长度 = count）
      │   └── 关键词检索：N 条（绿色条，长度 = count）
      └── Section 3：Prompt 预览
          ├── 标题："最终 Prompt"
          └── <pre class={styles.codeBlock}>{prompt}</pre>
```

### 2.4 交互行为

| 行为 | 描述 |
|------|------|
| 点击"查看检索详情" | 打开抽屉，`document.body.style.overflow = 'hidden'` |
| 点击遮罩层 | 关闭抽屉 |
| 点击 ✕ 按钮 | 关闭抽屉 |
| 按 Escape | 关闭抽屉 |
| 关闭抽屉 | `document.body.style.overflow = ''`，恢复滚动 |

### 2.5 视觉设计

- **抽屉面板**：`position: fixed; top: 0; right: 0; width: 480px; height: 100vh`，`var(--bg-primary)` 背景，`box-shadow: -2px 0 12px rgba(0,0,0,0.1)`，`z-index: 500`
- **遮罩层**：`position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 499`
- **滑入动画**：`transform: translateX(100%) → translateX(0)`，`transition: transform 0.25s ease`
- **相似度条形图**：水平 BarChart，x 轴 = similarity (0-1)，y 轴 = documentTitle。`var(--accent-color)` 填充
- **检索来源**：两个横向度量条（左蓝右绿），标签："向量检索：2 条" "关键词检索：2 条"
- **Prompt 预览**：`<pre>` 块，`max-height: 300px`，`overflow-y: auto`，等宽字体，`font-size: 0.75rem`

---

## 3. 实现任务分解

| Task ID | 描述 | 涉及文件 |
|---------|------|----------|
| T-01 | 后端类型：`StreamChunk`/`AskStreamChunk` 新增 `RetrievalDetail` / `SourceItem` | `rag.interface.ts`, `ask.interface.ts` |
| T-02 | 后端业务：`rag.service.ts` done chunk 中构建 `retrievalDetail` | `rag.service.ts` |
| T-03 | 后端传输：`ask.controller.ts` 传递 `retrievalDetail` | `ask.controller.ts` |
| T-04 | 前端类型 + hook：`sse.ts`/`useChat.ts` 扩展 | `sse.ts`, `useChat.ts` |
| T-05 | 前端图表依赖：安装 recharts | `apps/web/package.json` |
| T-06 | 前端组件：`RetrievalPanel` 抽屉 + Recharts 图表 | 新建 `RetrievalPanel.tsx` + `.module.css` |
| T-07 | 前端 `ChatMessage.tsx` 加"查看检索详情"按钮 | `ChatMessage.tsx`, `.module.css` |
| T-08 | E2E Mock + 测试：retrievalDetail mock + 3 个测试用例 | `test-data.ts`, `api-handlers.ts`, 新建 `retrieval.spec.ts` |

---

## 4. 测试用例（E2E 新增）

### TC-RETR-01："查看检索详情"按钮渲染
- 发送消息 → 等待回答完成 → "查看检索详情"按钮出现在操作栏中

### TC-RETR-02：点击按钮打开抽屉
- 点击"查看检索详情" → 抽屉从右侧滑入 → "检索详情"标题可见 → 相似度图表渲染

### TC-RETR-03：抽屉关闭
- 抽屉打开 → 点击遮罩层 → 抽屉关闭 → 按钮仍可见

---

## 5. 验收标准

- [ ] `StreamChunk` / `AskStreamChunk` 含 `RetrievalDetail` + `SourceItem` 类型
- [ ] done chunk 中包含 `retrievalDetail`（含 vectorSources / keywordSources）
- [ ] `Message.retrievalDetail` 正确存储
- [ ] 每条 assistant 消息底部有"查看检索详情"按钮
- [ ] 点击按钮打开抽屉，含相似度图表 + 检索来源对比 + prompt 预览
- [ ] 点击遮罩层/✕/Escape 关闭抽屉
- [ ] 抽屉内所有数据正确（相似度分数、来源计数、prompt 文本）
- [ ] 现有 38 个 E2E 测试无回归
- [ ] 新增 3 个 E2E 测试全部通过
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

# Agent 指令：实现 Layer 3 幻觉校验与 Layer 4 置信度标签

> 【执行纪律】以下指令包含 10 个具体修改点（后端 3 个 + 前端 7 个）以及约束规范和验收标准。你必须严格按照编号顺序逐一完成，每完成一个编号后在心里确认已完成，再进行下一个。禁止跳过任何步骤。完成后运行 `pnpm lint`，必须 0 error。

---

## 前置阅读（必须先读）

1. 读取 `specs/modules/rag-spec.md` 第 6 节（幻觉控制四层防御）
2. 读取 `specs/modules/chat-spec.md` 第 2.1 节（Message 模型）、第 5.3 节（SourceCitation）
3. 读取 `specs/modules/AI-SPEC.md` 第 4 节（幻觉控制策略）
4. 读取 `.cursorrules` 了解代码规范

---

## 任务范围

当前代码中 Layer 3 和 Layer 4 仅有 Spec 定义但未实现：

- `validateAnswer` 只在 `rag-spec.md` 中有伪代码，后端 `rag.service.ts` 的 `orchestrate()` 未调用
- `StreamChunk.confidenceLevel` 已定义但从未赋值
- 前端 `sse.ts` 的 `AskStreamChunk` 缺少 `confidenceLevel` 和 `hallucinationWarning` 字段
- 前端 `SourceCitation` 组件无置信度标签和幻觉警告 UI

你需要修改前后端，使这两层真正生效。

---

## 后端修改（apps/api/src/rag/）

### 1. 实现 validateAnswer 校验器

在 `rag/` 目录下新建 `rag.validator.ts`（或直接在 `rag.service.ts` 中实现，优先独立文件）：

```typescript
// 基于 rag-spec.md 第 6.3 节的简化规则实现
export function validateAnswer(
  answer: string,
  chunks: Array<{ content: string }>,
): { passed: boolean; suspiciousNumbers: string[] } {
  const numberPattern = /\d{4}年|\d+天|\d+%|\d+元|\d+小时|\d+次/g;

  // 提取回答中的数字/量词
  const answerNumbers = answer.match(numberPattern) || [];

  // 提取所有 chunk 中的数字集合
  const chunkText = chunks.map((c) => c.content).join('');
  const chunkNumbers = chunkText.match(numberPattern) || [];

  // 找出回答中有但 chunk 中没有的数字
  const suspicious = answerNumbers.filter((n) => !chunkNumbers.includes(n));

  return {
    passed: suspicious.length === 0,
    suspiciousNumbers: suspicious,
  };
}
```

### 2. 修改 rag.service.ts 的 orchestrate()

在 `orchestrate()` 方法中，**LLM 流式生成结束后**（`fullAnswer` 拼接完成），在 yield 最终 `done: true` 包之前：

```typescript
// Step 6 之后，Step 7 之前（保存消息之前）
const validation = validateAnswer(fullAnswer, merged);
const confidenceLevel = this.getConfidenceLevel(merged[0]?.hybridScore ?? 0);

// 最终 yield 包必须包含以下字段
yield {
  token: '',
  done: true,
  sources: this.buildSources(merged),
  confidenceLevel,
  hallucinationWarning: validation.passed ? undefined : '回答包含未在文档中验证的数据，请核实',
};
```

**约束**：

- 不能阻塞流式输出。`validateAnswer` 必须在 `fullAnswer` 拼接完成后、最终 yield 前调用，不能在流式过程中调用。
- `getConfidenceLevel` 方法按以下规则返回（来自 AI-SPEC.md）：
  - `hybridScore > 0.8` → `'high'`
  - `hybridScore >= 0.5` → `'medium'`
  - `hybridScore < 0.5` → `'low'`（防御性保留，理论上已被 Layer 1 拦截）

### 3. 确保 StreamChunk 接口包含新字段

检查并确保 `rag.interface.ts`（或相关接口文件）中的 `StreamChunk` 包含：

```typescript
interface StreamChunk {
  token: string;
  done: boolean;
  sources?: SourceCitation[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  error?: string;
}
```

---

## 前端修改（apps/web/src/）

### 4. 更新 SSE 类型定义（sse.ts）

在 `AskStreamChunk` 接口中补充缺失字段：

```typescript
export interface AskStreamChunk {
  chunk: string;
  done: boolean;
  sources?: SourceCitation[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  error?: string;
}
```

### 5. 更新 Message 类型

确保 `Message` 接口（或相关类型）包含：

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: SourceCitation[];
  confidenceLevel?: 'high' | 'medium' | 'low';
  hallucinationWarning?: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
}
```

### 6. 修改 useChat Hook

在 `useChat.ts` 中处理 SSE 结束包（`done: true`）时，将 `confidenceLevel` 和 `hallucinationWarning` 保存到对应的 assistant message 中：

```typescript
// 解析到 done: true 时
setMessages((prev) =>
  prev.map((m) =>
    m.id === assistantMsg.id
      ? {
          ...m,
          content: accumulated,
          status: 'complete',
          sources: data.sources,
          confidenceLevel: data.confidenceLevel,
          hallucinationWarning: data.hallucinationWarning,
        }
      : m,
  ),
);
```

### 7. 新增 ConfidenceBadge 组件

新建 `components/Chat/ConfidenceBadge.tsx`：

```typescript
import React from 'react';
import styles from './ConfidenceBadge.module.css';

interface Props {
  level?: 'high' | 'medium' | 'low';
}

const config = {
  high:   { text: '高置信度', className: styles.high },
  medium: { text: '中置信度', className: styles.medium },
  low:    { text: '低置信度', className: styles.low },
};

export const ConfidenceBadge: React.FC<Props> = ({ level }) => {
  if (!level) return null;
  const c = config[level];
  return <span className={`${styles.badge} ${c.className}`}>{c.text}</span>;
};
```

CSS（ConfidenceBadge.module.css）：

```css
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
}

.high {
  color: #388e3c;
  background: #e8f5e9;
}

.medium {
  color: #f57c00;
  background: #fff3e0;
}

.low {
  color: #d32f2f;
  background: #ffebee;
}
```

### 8. 新增 HallucinationWarning 组件

新建 `components/Chat/HallucinationWarning.tsx`：

```typescript
import React from 'react';
import styles from './HallucinationWarning.module.css';

export const HallucinationWarning: React.FC = () => (
  <div className={styles.warning}>
    ⚠️ 回答包含未在文档中验证的数据，请核实
  </div>
);
```

CSS（HallucinationWarning.module.css）：

```css
.warning {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(245, 124, 0, 0.1);
  border-left: 3px solid #f57c00;
  color: #e65100;
  font-size: 13px;
  border-radius: 0 4px 4px 0;
}
```

### 9. 修改 SourceCitation 组件

在 `SourceCitation.tsx`（或 `ChatMessage.tsx` 中的来源卡片区域）中：

- **顶部**：在文档标题旁添加 `ConfidenceBadge`
- **底部**：如果 `message.hallucinationWarning` 存在，渲染 `HallucinationWarning`

修改后的 SourceCitation 卡片结构：

```
┌─────────────────────────────────────┐
│ 📄 年假制度    [高置信度]            │
│ 相似度 89%                          │
│ ─────────────────────────────────── │
│ 年假需提前3天申请...                  │
│                                     │
│ ⚠️ 回答包含未在文档中验证的数据...    │  ← 仅在 hallucinationWarning 存在时显示
└─────────────────────────────────────┘
```

### 10. 深色模式适配

确保 `ConfidenceBadge` 和 `HallucinationWarning` 的 CSS 在 `[data-theme="dark"]` 下对比度舒适。使用 CSS Variables 而非硬编码颜色：

```css
/* 示例：深色模式覆盖 */
[data-theme='dark'] .high {
  color: #66bb6a;
  background: rgba(102, 187, 106, 0.15);
}
```

---

## 约束与规范

- **接口先行**：先修改 TypeScript 接口（StreamChunk / AskStreamChunk / Message），再改实现
- **模块隔离**：校验逻辑放在 `rag/` 模块，UI 组件放在 `components/Chat/`
- **禁止阻塞流式**：`validateAnswer` 只能在流结束后调用，严禁在 `for await` 循环中调用
- **命名导出**：所有组件使用 `export const`，禁止 `export default`
- **CSS Modules**：新组件必须配 `.module.css`
- **常量提取**：置信度阈值（0.8、0.5）提取为命名常量，禁止魔法数字

---

## 验收标准

- [ ] 后端 `rag.service.ts` 的 `orchestrate()` 在生成结束后调用 `validateAnswer`
- [ ] 后端最终 SSE 包包含 `confidenceLevel` 和 `hallucinationWarning`（如有）
- [ ] 前端 `sse.ts` 的 `AskStreamChunk` 包含上述字段
- [ ] 前端 assistant message 正确保存 `confidenceLevel` 和 `hallucinationWarning`
- [ ] 来源卡片顶部显示置信度标签（🟢高/🟡中/🔴低）
- [ ] 当 `validateAnswer` 检测出疑似幻觉时，消息下方显示橙色警告条
- [ ] 输入"年假怎么请" → 显示 🟢 高置信度，无警告
- [ ] 输入"试用期有年假吗"（边缘问题，相似度中等）→ 显示 🟡 中置信度
- [ ] 输入一个诱导 LLM 编造数字的问题（如"公司年假上限是多少天"如果文档未明确写上限数字）→ 如果 LLM 编造了文档中没有的数字，应显示 ⚠️ 警告
- [ ] `pnpm lint` 无 error
- [ ] 深色模式下标签和警告对比度舒适

完成后运行 `pnpm lint`，确保 0 error，然后提交。

---

## Git 提交信息模板

```bash
git add .
git commit -m "feat(phase-2): implement Layer 3 hallucination validation and Layer 4 confidence badges

- Add validateAnswer() with number-pattern cross-check against chunks
- Wire validation result into SSE stream end packet
- Add confidenceLevel calculation based on hybridScore thresholds
- Update AskStreamChunk and Message types with new fields
- Add ConfidenceBadge and HallucinationWarning UI components
- Integrate badges into SourceCitation cards
- Verified: high/medium/low badges render correctly, warning shows for suspicious answers"
```

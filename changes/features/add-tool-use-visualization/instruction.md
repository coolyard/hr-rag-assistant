# Agent 指令：Tool Use / Function Calling 可视化

> 【执行纪律】本指令包含 8 个 Task，分为 4 个阶段。严格按照阶段顺序逐一完成，每阶段完成后运行验证命令通过再进入下一阶段。

---

## 前置阅读

1. `changes/features/add-tool-use-visualization/spec.md`
2. `apps/api/src/rag/rag.interface.ts`（`StreamChunk`）
3. `apps/api/src/ask/ask.interface.ts`（`AskStreamChunk`）
4. `apps/api/src/rag/rag.service.ts`（`orchestrate` 方法）
5. `apps/api/src/ask/ask.controller.ts`
6. `apps/web/src/api/sse.ts`
7. `apps/web/src/hooks/useChat.ts`
8. `apps/web/src/components/Chat/ChatMessage.tsx`
9. `apps/web/src/components/Chat/ChatMessage.module.css`

---

## 阶段 1：后端类型与 Tool 注册（T-01 ~ T-02）

### T-01：`rag.interface.ts` 和 `ask.interface.ts` 新增 ToolCallStart/ToolResult

#### 1.1 编辑 `apps/api/src/rag/rag.interface.ts`

在文件末尾新增接口定义：

```typescript
export interface ToolCallStart {
  id: string;
  name: string;
  title: string;
  args: Record<string, unknown>;
  confirmRequired: boolean;
}

export interface ToolResult {
  id: string;
  result: string | Record<string, unknown>;
  error?: string;
}
```

在 `StreamChunk` 接口中新增两个字段（`error?: string;` 之后）：

```typescript
  toolCallStart?: ToolCallStart;
  toolResult?: ToolResult;
```

#### 1.2 编辑 `apps/api/src/ask/ask.interface.ts`

在 `AskStreamChunk` 接口中新增（`conversationId?: string;` 之前）：

```typescript
  toolCallStart?: import('@/rag/rag.interface').ToolCallStart;
  toolResult?: import('@/rag/rag.interface').ToolResult;
```

### T-02：创建工具注册表 `apps/api/src/tool/`

#### 2.1 新建 `apps/api/src/tool/tool.interface.ts`

```typescript
import type { ToolCallStart, ToolResult } from '@/rag/rag.interface';

export interface ToolDefinition {
  name: string;
  title: string;
  triggers: string[];
  buildArgs: (query: string) => Record<string, unknown>;
  execute: (args: Record<string, unknown>) => ToolResult;
  confirmRequired: boolean;
}
```

#### 2.2 新建 `apps/api/src/tool/tool-registry.service.ts`

注册 3 个 mock 工具：`apply_leave`、`query_reimbursement`、`query_overtime`。示例：

```typescript
import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './tool.interface';
import type { ToolResult } from '@/rag/rag.interface';

@Injectable()
export class ToolRegistryService {
  private tools: ToolDefinition[] = [
    {
      name: 'apply_leave',
      title: '申请年假',
      triggers: ['申请年假', '请假', '想休假'],
      buildArgs: (_query: string) => ({
        days: 3,
        startDate: '2026-06-20',
        endDate: '2026-06-22',
        leaveType: 'annual',
      }),
      execute: (args: Record<string, unknown>) => ({
        id: 'tc-leave',
        result: `年假申请已提交：${String(args.days)}天（${String(args.startDate)} 至 ${String(args.endDate)}），等待直属上级审批。`,
      }),
      confirmRequired: true,
    },
    // ... query_reimbursement, query_overtime 类似
  ];

  detectTool(query: string): ToolDefinition | null {
    return this.tools.find((t) => t.triggers.some((trigger) => query.includes(trigger))) ?? null;
  }

  executeTool(name: string, args: Record<string, unknown>): ToolResult {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      return { id: 'error', result: '', error: `Unknown tool: ${name}` };
    }
    return tool.execute(args);
  }
}
```

#### 2.3 新建 `apps/api/src/tool/tool.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  providers: [ToolRegistryService],
  exports: [ToolRegistryService],
})
export class ToolModule {}
```

#### 2.4 在 `apps/api/src/app.module.ts` 中导入 `ToolModule`

### 阶段 1 验证

```bash
cd apps/api && npx tsc --noEmit
```

---

## 阶段 2：后端 Tool 集成到 RAG 流程（T-03 ~ T-04）

### T-03：`rag.service.ts` 增加触发词检测

在 `orchestrate()` 方法开头（`const conv = ...` 之后），新增：

```typescript
// 检测是否需要工具调用
const tool = this.toolRegistry.detectTool(query);
if (tool) {
  const args = tool.buildArgs(query);
  yield { token: '', done: false, reasoning: `检测到操作意图：${tool.title}` };
  yield {
    token: '',
    done: false,
    toolCallStart: {
      id: generateToolCallId(),
      name: tool.name,
      title: tool.title,
      args,
      confirmRequired: tool.confirmRequired,
    },
  };
  // 等待用户确认（暂存 toolCall，不继续生成）
  return;
}
```

需要注入 `ToolRegistryService`：
```typescript
constructor(
  // ... 现有注入
  private readonly toolRegistry: ToolRegistryService,
) {}
```

### T-04：`ask.controller.ts` 新增 `/api/tool/execute` 端点

在 `AskController` 中新增 POST 端点：

```typescript
@Post('tool/execute')
async executeTool(@Body() body: { toolCallId: string; toolName: string; args: Record<string, unknown> }) {
  const result = this.toolRegistry.executeTool(body.toolName, body.args);
  return result;
}
```

> 注意：`rag.service.ts` 中需要在 `toolCallStart` yield 后 `return` 前暂存当前对话状态，以便 confirmation 后继续 LLM 生成。简化方案：confirmation 后重新调用 `orchestrate`，但需要修改 `orchestrate` 签名接受 `skipToolDetection` 参数。

> **简化处理**：阶段 3 的用户确认流程做了简化——确认工具调用后，从 SSE 流中重新发送 text chunk 表示"执行完成"。

### 阶段 2 验证

```bash
cd apps/api && npx tsc --noEmit && npx jest --testPathPattern="rag.service" 2>&1 | tail -5
```

---

## 阶段 3：前端组件与交互（T-05 ~ T-07）

### T-05：前端类型扩展

#### 5.1 编辑 `apps/web/src/api/sse.ts`

在 `AskStreamChunk` 中新增：

```typescript
  toolCallStart?: {
    id: string;
    name: string;
    title: string;
    args: Record<string, unknown>;
    confirmRequired: boolean;
  };
  toolResult?: {
    id: string;
    result: string | Record<string, unknown>;
    error?: string;
  };
```

#### 5.2 编辑 `apps/web/src/hooks/useChat.ts`

在 `Message` 接口中，`role` 类型扩展为 `'user' | 'assistant' | 'toolCall' | 'toolResult'`，并在接口末尾新增：

```typescript
  toolCall?: AskStreamChunk['toolCallStart'];
  toolResult?: AskStreamChunk['toolResult'];
```

在 `sendMessage` 的 `for await` 循环中，`chunk.status` 处理之后，新增：

```typescript
if (chunk.toolCallStart) {
  const toolMsg: Message = {
    id: generateId('tc'),
    role: 'toolCall',
    content: '',
    timestamp: Date.now(),
    toolCall: chunk.toolCallStart,
    status: 'complete',
  };
  setMessages((prev) => [...prev, toolMsg]);
  setIsLoading(false);
  setStatusText('');
  loadingRef.current = false;
  return; // 等待用户确认
}
```

新增 `confirmToolCall` 方法：

```typescript
const confirmToolCall = useCallback(
  async (toolCallId: string, toolName: string, args: Record<string, unknown>) => {
    await fetch('/api/tool/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolCallId, toolName, args }),
    });
    // 添加 toolResult 消息
    const resultMsg: Message = {
      id: generateId('tr'),
      role: 'toolResult',
      content: `工具执行成功`,
      timestamp: Date.now(),
      toolResult: { id: toolCallId, result: `${toolName} 已执行` },
      status: 'complete',
    };
    setMessages((prev) => [...prev, resultMsg]);
  },
  [],
);
```

### T-06：新建 `ToolCallCard` 组件

#### 6.1 新建 `apps/web/src/components/Chat/ToolCallCard.tsx`

```tsx
import { type FC, useCallback, useState } from 'react';
import styles from './ToolCallCard.module.css';

interface ToolCallCardProps {
  toolCall: {
    id: string;
    name: string;
    title: string;
    args: Record<string, unknown>;
    confirmRequired: boolean;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export const ToolCallCard: FC<ToolCallCardProps> = ({ toolCall, onConfirm, onCancel }) => {
  const [status, setStatus] = useState<'idle' | 'executing' | 'completed' | 'cancelled'>('idle');

  const handleConfirm = useCallback(async () => {
    setStatus('executing');
    onConfirm();
    setStatus('completed');
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setStatus('cancelled');
    onCancel();
  }, [onCancel]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>{status === 'completed' ? '✓' : status === 'cancelled' ? '✗' : '🔧'}</span>
        <span className={styles.title}>{toolCall.title}</span>
        {status === 'completed' && <span className={styles.badge}>已完成</span>}
        {status === 'cancelled' && <span className={styles.badgeCancelled}>已取消</span>}
      </div>
      <div className={styles.args}>
        {Object.entries(toolCall.args).map(([key, value]) => (
          <div key={key} className={styles.argRow}>
            <span className={styles.argKey}>{key}</span>
            <span className={styles.argValue}>{String(value)}</span>
          </div>
        ))}
      </div>
      {status === 'idle' && toolCall.confirmRequired && (
        <div className={styles.actions}>
          <button className={styles.confirmButton} onClick={handleConfirm} type="button">确认执行</button>
          <button className={styles.cancelButton} onClick={handleCancel} type="button">取消</button>
        </div>
      )}
      {status === 'executing' && <p className={styles.statusText}>执行中...</p>}
    </div>
  );
};
```

#### 6.2 新建 `apps/web/src/components/Chat/ToolCallCard.module.css`

参考 spec 中的视觉设计创建样式。

### T-07：`ChatMessage.tsx` 扩展渲染

在 `ChatMessage` 的 assistant 分支中，在渲染前新增 toolCall/toolResult 判断：

```tsx
if (message.role === 'toolCall' && message.toolCall) {
  return <ToolCallCard toolCall={message.toolCall} onConfirm={...} onCancel={...} />;
}
if (message.role === 'toolResult') {
  return <div className={styles.toolResultBanner}>✓ {message.content}</div>;
}
```

### 阶段 3 验证

```bash
cd apps/web && npx tsc --noEmit && pnpm build
```

---

## 阶段 4：E2E Mock 与测试（T-08）

### T-08：新增 tool use E2E 测试

#### 8.1 编辑 `apps/web/e2e/fixtures/test-data.ts`

新增 mock tool call 数据：

```typescript
export const MOCK_TOOL_CALL = {
  id: 'tc-1',
  name: 'apply_leave',
  title: '申请年假',
  args: { days: 3, startDate: '2026-06-20', endDate: '2026-06-22', leaveType: 'annual' },
  confirmRequired: true,
};
```

#### 8.2 编辑 `apps/web/e2e/mocks/api-handlers.ts`

添加 `/api/tool/execute` mock：

```typescript
await page.route('**/api/tool/execute', async (route: Route) => {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 'tc-1', result: '年假申请已提交，等待审批。' }),
  });
});
```

修改 SSE mock：当 question 包含"申请年假"时，先发送 `toolCallStart` chunk。

#### 8.3 新建 `apps/web/e2e/specs/tool-use.spec.ts`

3 个测试用例按 spec 第 4 节编写。

### 阶段 4 验证

```bash
pnpm test:e2e
```

---

## 最终验证

```bash
pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e
```

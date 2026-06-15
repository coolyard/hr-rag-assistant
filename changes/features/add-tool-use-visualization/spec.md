# Feature Spec：Tool Use / Function Calling 可视化

> 本 Feature 为 Chat 增加 Agent 工具调用能力，当用户请求涉及操作（如申请年假、查询报销）时，模型可选择调用预定义的工具，前端渲染"工具调用卡片"展示参数、确认交互和执行结果。展示 AI Agent 前端范式的核心理解。
>
> 对应模块：chat-spec.md、api-spec.md
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前系统只有"问-答"模式，无法执行具体操作。真正的 AI Agent 需要能调用工具（function calling）来实现"感知 → 决策 → 执行"闭环。上海大厂（字节、腾讯、阿里）的 AI 前端岗位非常看重候选人对 Agent 范式的理解——不仅仅是渲染文本，而是管理异步工具调用的完整生命周期。

本功能先做 mock 实现：后端内置一组预定义工具，当前端检测到某些触发词时，模拟模型决定调用工具，前端渲染交互式"工具调用卡片"。

### 1.2 目标

1. **后端**：SSE 流中新增 `toolCalls` 消息类型，模拟 3 个预定义工具
2. **前端**：新增 `ToolCallCard` 组件，展示工具调用参数 + 确认/取消交互 + 执行结果
3. **消息模型**：扩展 Message 类型支持 `ToolCall` / `ToolResult` 角色
4. **流式兼容**：tool call 在 SSE 流中以专用 chunk 传递，不影响现有文本流

### 1.3 预定义工具（Mock 场景）

| 工具名 | 触发条件 | 参数 | 模拟结果 |
|--------|----------|------|----------|
| `apply_leave` | 用户说"申请年假" | `startDate, endDate, days, reason` | "年假申请已提交，等待审批" |
| `query_reimbursement` | 用户说"报销" / "报销记录" | `statusFilter` | 返回报销列表 JSON |
| `query_overtime` | 用户说"加班" / "调休" | `dateRange` | 返回加班/调休余额 |

### 1.4 明确不做

- 不接入真实的 OpenAI function calling API（保持 Ollama + 本地 mock）
- 不实现 tool call 的 streaming delta（一次性返回完整 tool call JSON）
- 不实现多轮 tool call（单次一问一 tool 或一问一答）

---

## 2. 技术方案

### 2.1 数据流设计

```
用户提问："帮我申请 3 天年假"
  ↓
后端检测触发词 → 匹配 apply_leave 工具
  ↓
SSE 流：
  { toolCallStart: { id: "tc-1", name: "apply_leave", args: { days: 3, ... } } }
  { status: "等待确认工具调用..." }
  ↓
前端：渲染 ToolCallCard（参数预览 + "确认执行"按钮）
  ↓
用户点击确认
  ↓
前端发送 POST /api/tool/execute { toolCallId, confirmed: true, args }
  ↓
后端返回执行结果
  ↓
SSE 恢复：
  { toolResult: { id: "tc-1", result: "年假申请已提交，等待审批" } }
  → 后续正常 LLM 流："好的，您的年假申请已提交..."
  ↓
前端：ToolCallCard 切换为"已完成"状态，正常回答流开始
```

### 2.2 接口变更

#### StreamChunk（后端）新增字段

```typescript
export interface StreamChunk {
  // ... 现有字段不变
  toolCallStart?: ToolCallStart;   // 新增：工具调用开始
  toolResult?: ToolResult;         // 新增：工具调用结果
}

export interface ToolCallStart {
  id: string;
  name: string;         // 工具名称
  title: string;        // 用户可读标题，如"申请年假"
  args: Record<string, unknown>;
  confirmRequired: boolean; // 是否需要用户确认
}

export interface ToolResult {
  id: string;
  result: string | Record<string, unknown>;
  error?: string;
}
```

#### AskStreamChunk（SSE 传输）新增字段

```typescript
export interface AskStreamChunk {
  // ... 现有字段不变
  toolCallStart?: ToolCallStart;
  toolResult?: ToolResult;
}
```

#### Message（前端）扩展 role 类型

```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'toolCall' | 'toolResult';  // 扩展
  content: string;
  // ... 其他字段
  toolCall?: ToolCallStart;     // 仅 role === 'toolCall' 时存在
  toolResult?: ToolResult;      // 仅 role === 'toolResult' 时存在
}
```

### 2.3 组件结构

```
ChatMessage（assistant 分支扩展）
├── （如果是 toolCall 消息）ToolCallCard
│   ├── 工具图标（日历/发票/时钟）+ 工具标题
│   ├── 参数预览（JSON 格式化的键值对）
│   ├── [需要确认时] 确认 / 取消 按钮
│   └── [已确认/有结果时] 绿色勾 + 结果摘要
├── （如果是 toolResult 消息）ToolResultBanner
│   └── 淡绿色/淡红色背景 + 结果文本
└── （普通 assistant 消息）现有逻辑不变
```

### 2.4 ToolCallCard 交互状态机

```
idle（等待确认）
  ├── 用户点击"确认执行" → executing（加载中）
  │   └── 后端返回结果 → completed（显示结果 + 绿色勾）
  └── 用户点击"取消" → cancelled（红色"已取消"，不执行后续 LLM 回答）
```

### 2.5 视觉设计

- **工具调用卡片**：独立于消息气泡，`var(--bg-secondary)` 背景，左边框 `3px solid var(--accent-color)`，圆角 8px
- **参数区域**：使用 Description List 布局（key: 左列，value: 右列），`font-size: 0.83rem`
- **确认按钮**：`var(--accent-color)` 背景 + 白色文字 + 勾选图标
- **取消按钮**：`var(--bg-tertiary)` 边框 + 灰色文字
- **已完成状态**：卡片顶部绿色勾 + "已完成" 标签，整体灰一度
- **取消状态**：红色 X + "已取消"，卡片灰一度

---

## 3. 实现任务分解

| Task ID | 描述 | 涉及文件 |
|---------|------|----------|
| T-01 | 后端类型：`StreamChunk`/`AskStreamChunk` 增加 `ToolCallStart`/`ToolResult` | `rag.interface.ts`, `ask.interface.ts` |
| T-02 | 后端工具注册表 + mock tool 实现 | 新建 `apps/api/src/tool/` 目录 |
| T-03 | 后端 `rag.service.ts` 增加触发词检测 + tool call 模拟 | `rag.service.ts` |
| T-04 | 后端 `ask.controller.ts` 新增 `/api/tool/execute` 端点 | `ask.controller.ts` |
| T-05 | 前端类型：`sse.ts`/`useChat.ts` 扩展 Message 和 chunk 类型 | `sse.ts`, `useChat.ts` |
| T-06 | 前端组件：`ToolCallCard` 组件（状态机 + 确认交互） | 新建 `ToolCallCard.tsx` + `.module.css` |
| T-07 | 前端 `ChatMessage.tsx` 扩展渲染 toolCall/toolResult 消息 | `ChatMessage.tsx` |
| T-08 | E2E Mock + 测试：tool call 数据 + 3 个测试用例 | `test-data.ts`, `api-handlers.ts`, 新建 `tool-use.spec.ts` |

---

## 4. 测试用例（E2E 新增）

### TC-TOOL-01：工具调用卡片渲染
- **前置**：Employee 登录
- **步骤**：发送"帮我申请 3 天年假"
- **预期**：出现 ToolCallCard，显示"申请年假"标题和参数

### TC-TOOL-02：确认工具调用
- **前置**：工具调用卡片出现
- **步骤**：点击"确认执行"
- **预期**：卡片切换为 loading → completed，显示"已提交"结果

### TC-TOOL-03：取消工具调用
- **前置**：工具调用卡片出现
- **步骤**：点击"取消"
- **预期**：卡片显示"已取消"，不出现后续 LLM 回答

---

## 5. 验收标准

- [ ] `StreamChunk`/`AskStreamChunk` 含 `ToolCallStart`/`ToolResult` 类型
- [ ] 后端检测到"申请年假"/"报销"/"加班"时发出 tool call chunk
- [ ] 前端渲染 ToolCallCard，支持确认/取消交互
- [ ] 确认后调用 `/api/tool/execute` 并展示结果
- [ ] 取消后不继续生成回答
- [ ] 现有 29 个 E2E 测试无回归
- [ ] 新增 3 个 tool use E2E 测试全部通过
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

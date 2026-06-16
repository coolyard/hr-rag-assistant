# Feature Spec：多轮对话持久化 + 对话列表

> 本 Feature 将对话存储从内存 Map 迁移到 SQLite 持久化，前端新增对话列表侧边栏，支持对话切换、重命名、删除和搜索。对标 ChatGPT/Claude 的对话管理体验。
>
> 对应模块：chat-spec.md
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前对话存储在内存 `Map<string, Conversation>` 中，服务重启或页面刷新后全部丢失。作为面试 demo，这严重影响了产品完整度和演示体验。对话持久化是 AI Chat 产品的基础能力，实现它展示了你对**状态管理 + 数据持久化 + 前后端数据同步**的完整理解。

### 1.2 目标

1. **后端**：用 Prisma + SQLite 替换内存 Map，持久化对话和消息
2. **后端**：新增 CRUD API：对话列表、创建对话、重命名、删除对话、消息查询
3. **前端**：新增左侧对话列表侧边栏，支持切换、新建、重命名、删除
4. **前端**：恢复已保存的对话历史

### 1.3 明确不做

- 不使用 PostgreSQL/MySQL（保持零外部依赖，SQLite 仅需一个文件）
- 不实现对话搜索的模糊匹配（v1 仅前端过滤）
- 不实现对话导出/分享
- 不实现对话归档

---

## 2. 技术方案

### 2.1 数据模型（Prisma Schema）

```prisma
model Conversation {
  id        String    @id
  title     String    @default("新对话")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  userId    String
  messages  Message[]
}

model Message {
  id             String   @id
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String   // 'user' | 'assistant'
  content        String
  reasoning      String?
  sources        String?  // JSON stringified SourceCitation[]
  followUps      String?  // JSON stringified string[]
  status         String   @default("complete")
  error          String?
  timestamp      DateTime @default(now())
}
```

### 2.2 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/conversations` | 获取当前用户对话列表 |
| `POST` | `/api/conversations` | 创建新对话 |
| `PATCH` | `/api/conversations/:id` | 重命名对话 |
| `DELETE` | `/api/conversations/:id` | 删除对话 |
| `GET` | `/api/conversations/:id/messages` | 获取对话消息列表 |

### 2.3 前端组件结构

```
App Layout
├── Sidebar（左侧 260px，可折叠）
│   ├── 新建对话按钮
│   ├── 搜索框（前端过滤）
│   └── 对话列表
│       ├── 每个对话项：标题 + 时间 + 更多菜单（重命名/删除）
│       └── 当前活跃对话高亮
└── Main Content（右侧）
    └── ChatPage / DocumentPage / ProfilePage（已有路由不变）
```

### 2.4 交互行为

| 行为 | 描述 |
|------|------|
| 新建对话 | 创建空对话，切换到新对话，输入区聚焦 |
| 切换对话 | 从列表加载历史消息，恢复 conversationId |
| 重命名 | 双击标题或菜单选"重命名"，内联编辑，Enter 确认 |
| 删除 | 弹出确认对话框 → 调用 DELETE API → 从列表移除 |
| 搜索 | 输入文本过滤列表（前端 `filter`） |
| 空状态 | 无对话时显示"暂无对话，点击上方按钮开始" |

### 2.5 后端服务层改造

- **新增 `ConversationPersistenceService`**：封装 Prisma 调用
- **改造 `ConversationStoreService`**：改为 Facade，内部调用 Prisma（保留现有接口签名，减少上层改动）
- **`ask.controller.ts` 和 `chat.service.ts`**：消息存储时同步写入 Prisma

---

## 3. 实现任务分解

| Task ID | 描述 | 涉及文件 |
|---------|------|----------|
| T-01 | 安装 Prisma + SQLite，创建 schema，生成 client | `prisma/schema.prisma`, `apps/api/package.json` |
| T-02 | 后端：改造 `ConversationStoreService` 使用 Prisma | `conversation-store.service.ts` |
| T-03 | 后端：新增对话 CRUD API（controller + module） | 新建 `conversation/` 目录 |
| T-04 | 后端：ask 流程中消息落库 | `rag.service.ts`, `chat.service.ts` |
| T-05 | 前端：新增 `useConversations` hook（React Query） | 新建 `hooks/useConversations.ts` |
| T-06 | 前端：新增 Sidebar 组件 + 对话列表 | 新建 `Sidebar.tsx`, `ConversationList.tsx` |
| T-07 | 前端：改造 `useChat` 支持加载历史消息 | `useChat.ts` |
| T-08 | 前端：`App.tsx` 引入 Sidebar 布局 | `App.tsx`, `App.module.css` |
| T-09 | E2E Mock + 测试：对话 CRUD + 3 个测试用例 | 更新 mock handlers + 新建 `conversations.spec.ts` |

---

## 4. 测试用例（E2E 新增）

### TC-CONV-01：新建对话并显示在列表中
- **登录** → 点击"新建对话" → 列表中出现新对话项

### TC-CONV-02：重命名对话
- 对话列表 hover → 点击更多菜单 → 重命名 → 输入新名称 → 确认 → 列表更新

### TC-CONV-03：删除对话
- 对话列表 hover → 点击更多菜单 → 删除 → 确认 → 列表移除该项

---

## 5. 验收标准

- [ ] Prisma + SQLite 成功迁移，数据库文件生成
- [ ] 对话和消息在刷新/重启后完整保留
- [ ] 对话列表 CRUD API 全部可用
- [ ] 前端 Sidebar 渲染对话列表，支持新建/切换/重命名/删除/搜索
- [ ] 现有 29 个 E2E 测试无回归
- [ ] 新增 3 个 conversation E2E 测试全部通过
- [ ] `pnpm lint && pnpm format:check && pnpm build && pnpm test` 通过

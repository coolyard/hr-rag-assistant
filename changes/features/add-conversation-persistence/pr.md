## 变更描述

将对话存储从内存 Map 迁移到 SQLite（Prisma ORM），实现对话和消息的持久化。前端新增左侧对话列表侧边栏，支持新建、切换、重命名、删除和搜索对话，对标 ChatGPT/Claude 的对话管理体验。

## 关联 Task

- **T-01**: 安装 Prisma + SQLite，创建 schema，生成 client
- **T-02**: 改造 `ConversationStoreService` 使用 Prisma
- **T-03**: 新增对话 CRUD API（5 个端点）
- **T-04**: ask 流程中消息落库
- **T-05**: 前端 `useConversations` hook（React Query）
- **T-06**: 前端 Sidebar + ConversationList 组件
- **T-07**: `useChat` 支持加载历史消息
- **T-08**: `App.tsx` 引入 Sidebar 布局
- **T-09**: E2E 测试：3 个 conversation CRUD 用例

## 验收标准

### 后端
- [ ] Prisma + SQLite 迁移成功，`prisma/dev.db` 生成
- [ ] `ConversationStoreService` 全部方法改为 Prisma 异步调用
- [ ] CRUD API 5 个端点全部可用
- [ ] 消息在 ask 流程中自动落库
- [ ] `cd apps/api && npx tsc --noEmit && npx jest` 通过

### 前端
- [ ] React Query 管理对话列表状态，乐观更新
- [ ] Sidebar 渲染对话列表、搜索框、新建按钮
- [ ] 支持切换对话（加载历史消息）
- [ ] 支持双击重命名、菜单删除
- [ ] 页面刷新后对话不丢失
- [ ] 布局适配（260px 侧边栏 + 主内容区）

### E2E 测试（新增 3 个）
- [ ] TC-CONV-01: 新建对话并显示在列表
- [ ] TC-CONV-02: 重命名对话
- [ ] TC-CONV-03: 删除对话

### 回归验证
- [ ] `pnpm test` 全部通过
- [ ] `pnpm test:e2e` 32 个测试通过（29 原有 + 3 新增）
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

## Spec 变更

- 新增：`changes/features/add-conversation-persistence/spec.md`、`instruction.md`
- 新增：`apps/api/prisma/schema.prisma`
- 修改：`apps/api/package.json`（prisma 依赖）
- 新增：`apps/api/src/prisma/`（PrismaService + Module）
- 修改：`conversation-store.service.ts`（Map → Prisma）
- 新增：`apps/api/src/conversation/`（CRUD Controller）
- 修改：`apps/web/src/hooks/useChat.ts`（loadConversation）
- 新增：`apps/web/src/hooks/useConversations.ts`
- 新增：`apps/web/src/components/Layout/Sidebar.tsx` + `.module.css`
- 修改：`apps/web/src/App.tsx`（Sidebar 布局）

## 审查重点

- Prisma async 方法对原有同步调用的影响（`chat.service.ts` 需改为 async）
- 对话消息的 JSON 序列化/反序列化（sources、followUps 字段）
- React Query cache key 策略是否合理
- Sidebar 与移动端布局的兼容性（当前仅桌面）
- 对话删除的 onDelete Cascade 配置是否正确

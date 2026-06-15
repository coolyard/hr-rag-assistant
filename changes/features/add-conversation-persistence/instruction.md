# Agent 指令：多轮对话持久化 + 对话列表

> 【执行纪律】本指令包含 9 个 Task，分 4 阶段。严格按序完成，每阶段验证通过再进下一阶段。

---

## 前置阅读

1. `changes/features/add-conversation-persistence/spec.md`
2. `apps/api/src/chat/conversation-store.service.ts`
3. `apps/api/src/chat/chat.service.ts`
4. `apps/api/src/chat/chat.interface.ts`
5. `apps/api/src/ask/ask.controller.ts`
6. `apps/web/src/hooks/useChat.ts`
7. `apps/web/src/App.tsx`
8. `apps/web/src/api/client.ts`

---

## 阶段 1：Prisma + SQLite 基础设施（T-01）

### T-01：安装 Prisma，创建 Schema，生成 Client

#### 1.1 安装依赖

```bash
cd apps/api && pnpm add prisma @prisma/client && npx prisma init --datasource-provider sqlite
```

#### 1.2 编辑 `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Conversation {
  id        String    @id
  title     String    @default("新对话")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  userId    String
  messages  Message[]
}

model Message {
  id             String       @id
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String
  content        String       @default("")
  reasoning      String?
  sources        String?
  followUps      String?
  status         String       @default("complete")
  error          String?
  timestamp      DateTime     @default(now())
}
```

#### 1.3 运行迁移

```bash
cd apps/api && npx prisma migrate dev --name init
```

#### 1.4 创建 `apps/api/src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### 1.5 创建 `apps/api/src/prisma/prisma.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

#### 1.6 在 `apps/api/src/app.module.ts` 中导入 `PrismaModule`

### 阶段 1 验证

```bash
cd apps/api && npx tsc --noEmit && ls prisma/dev.db
```

---

## 阶段 2：后端服务层改造（T-02 ~ T-04）

### T-02：改造 `ConversationStoreService` 使用 Prisma

将 `conversation-store.service.ts` 中的 `Map` 替换为 Prisma 调用。核心方法改成异步：

```typescript
@Injectable()
export class ConversationStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(title: string, userId: string): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: {
        id: generateId('conv'),
        title,
        userId,
      },
    });
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({ where: { id }, include: { messages: true } });
  }

  async addMessage(convId: string, message: Message): Promise<void> {
    await this.prisma.message.create({
      data: {
        id: message.id,
        conversationId: convId,
        role: message.role,
        content: message.content,
        reasoning: message.reasoning ?? '',
        sources: message.sources ? JSON.stringify(message.sources) : null,
        status: message.status ?? 'complete',
        error: message.error,
        timestamp: new Date(message.timestamp),
      },
    });
    // Trim to last N messages
    const msgCount = await this.prisma.message.count({ where: { conversationId: convId } });
    if (msgCount > MAX_MESSAGES) {
      const toDelete = msgCount - MAX_MESSAGES;
      const oldest = await this.prisma.message.findMany({
        where: { conversationId: convId },
        orderBy: { timestamp: 'asc' },
        take: toDelete,
      });
      await this.prisma.message.deleteMany({
        where: { id: { in: oldest.map((m) => m.id) } },
      });
    }
  }

  async getMessages(convId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async findConversationsByUser(userId: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { take: 1, orderBy: { timestamp: 'desc' } } },
    });
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    await this.prisma.conversation.update({ where: { id }, data: { title, updatedAt: new Date() } });
  }

  async deleteConversation(id: string): Promise<void> {
    await this.prisma.conversation.delete({ where: { id } });
  }
}
```

> 注意：所有调用方需改为 `async/await`。

### T-03：新增对话 CRUD API

新建 `apps/api/src/conversation/conversation.controller.ts`，实现 5 个端点（见 spec 2.2）。

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ConversationStoreService } from '@/chat/conversation-store.service';
import type { UserPayload } from '@/auth/auth.interface';

@Controller('api/conversations')
export class ConversationController {
  constructor(private readonly store: ConversationStoreService) {}

  @Get()
  async list(@Req() req: Request) {
    const user = req.user as UserPayload;
    return this.store.findConversationsByUser(user.sub);
  }

  @Post()
  async create(@Req() req: Request) {
    const user = req.user as UserPayload;
    return this.store.createConversation('新对话', user.sub);
  }

  @Patch(':id')
  async rename(@Param('id') id: string, @Body('title') title: string) {
    await this.store.updateConversationTitle(id, title);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.store.deleteConversation(id);
    return { success: true };
  }

  @Get(':id/messages')
  async messages(@Param('id') id: string) {
    return this.store.getMessages(id);
  }
}
```

> 新建 `conversation.module.ts`，在 `app.module.ts` 中导入。

### T-04：ask 流程中消息落库

在 `rag.service.ts` 的 `orchestrate` 方法中，原有 `this.chatService.addUserMessage` 和 `addAssistantMessage` 调用已经通过 `chat.service.ts` → `ConversationStoreService.addMessage` 链接触发 Prisma 写入。确保异步方法调用链完整即可。

### 阶段 2 验证

```bash
cd apps/api && npx tsc --noEmit && npx jest 2>&1 | tail -5
```

---

## 阶段 3：前端对话列表侧边栏（T-05 ~ T-08）

### T-05：新建 `useConversations` hook

```bash
cd apps/web && pnpm add @tanstack/react-query
```

新建 `apps/web/src/hooks/useConversations.ts`：

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  messages: Array<{ content: string }>;
}

export function useConversations() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiClient.get<ConversationItem[]>('/api/conversations'),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.post<ConversationItem>('/api/conversations'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiClient.patch(`/api/conversations/${id}`, { title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/conversations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });

  return { listQuery, createMutation, renameMutation, deleteMutation };
}
```

### T-06：新建 Sidebar 组件

新建 `apps/web/src/components/Layout/Sidebar.tsx`，包含：
- 新建对话按钮（顶部）
- 搜索输入框
- 对话列表映射渲染（`map` + 高亮当前活跃）
- 每个对话项：标题（可双击编辑）+ 时间 + hover 显示更多菜单（重命名/删除）
- 空状态提示

### T-07：改造 `useChat` 支持加载历史

`useChat` 新增 `loadConversation(conversationId: string)` 方法：
- 调用 `GET /api/conversations/:id/messages`
- 将历史消息设置到 `messages` state
- 设置 `conversationId`

同步改造 `sendMessage` 使其在 `conversationId` 存在时继续在同对话中追加。

### T-08：`App.tsx` 引入 Sidebar 布局

`App.tsx` 改为左右布局：
```tsx
<div className={styles.appLayout}>
  <Sidebar />
  <main className={styles.mainContent}>
    <Routes>...</Routes>
  </main>
</div>
```

### 阶段 3 验证

```bash
cd apps/web && npx tsc --noEmit && pnpm build
```

---

## 阶段 4：E2E 测试（T-09）

### T-09：新增 conversation E2E 测试

#### 9.1 更新 `apps/web/e2e/mocks/api-handlers.ts`

添加对话 CRUD mock handler。

#### 9.2 新建 `apps/web/e2e/specs/conversations.spec.ts`

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

# Feature Spec：React 生产级模式（Error Boundary + Suspense + 消息操作按钮）

> 本 Feature 为前端补齐三个 React 生产级核心模式：Error Boundary 错误边界、React.lazy + Suspense 代码分割、AI 消息操作按钮（复制/分享）。三者都是大厂面试的高频考点，且改动量小、纯前端、无后端依赖。
>
> 对应模块：无（纯前端改动）

---

## 1. 需求背景与目标

### 1.1 背景

当前项目存在三个明显的"生产级缺失"：

1. **无 Error Boundary**：任何组件运行时错误都会导致整个页面白屏，React 18 默认行为就是卸载整棵组件树。面试时如果演示中某个 API 挂了（比如 Ollama 没启动），整个页面会崩溃——这在面试中是致命减分项。

2. **无 Code Splitting**：`ChatPage`、`DocumentPage`、`ProfilePage` 全部同步 `import`，打进一个 bundle（270 KB JS），首屏加载时四个页面全部下载。大厂面试几乎必问"你怎么做代码分割"。

3. **消息无可操作性**：用户无法复制 AI 回答文本，无法分享对话。ChatGPT / Claude 等产品的标准交互缺失。

### 1.2 目标

1. **Error Boundary**：全局错误降级，崩溃时显示友好"出错了"界面 + 重试按钮
2. **Lazy Loading**：页面级代码分割，每个页面独立 chunk，首屏只加载当前页面
3. **消息操作**：每条 AI 回答底部增加复制按钮（一键复制，包含 toast 反馈）和分享按钮（复制对话链接）

### 1.3 明确不做

- 不做错误上报（Sentry 集成）
- 不做基于路由的 prefetch（`onMouseEnter` 预加载懒加载组件）
- 不做消息"分享"的持久化（不新增后端接口，仅复制 URL）
- 不做消息编辑、点赞/踩（这些留给后续的 Feedback Loop 功能）

---

## 2. 技术方案

### 2.1 Error Boundary

React 16+ 的 Error Boundary 需要用 class component 实现（`componentDidCatch`）。

```
App
└── ErrorBoundary（包住所有 Routes）
    └── Routes
        ├── /chat     → ChatPage
        ├── /documents → DocumentPage
        └── /profile  → ProfilePage
```

**ErrorBoundary 行为**：
- 捕获子组件树中任何渲染错误、生命周期错误
- 显示 ErrorFallback UI：「页面出错了」+ 错误信息 + "重试"按钮
- 不捕获异步错误（async/await 内部的）、事件处理器中的错误
- `componentDidCatch` 中 `console.error` 记录

**ErrorFallback UI 设计**：
- 居中布局，灰色背景
- 感叹号图标（⚠️ 或 SVG）+ "页面出错了" 标题
- 错误信息（小字灰色，`error.message`）
- "重试"按钮（重置 ErrorBoundary state → 重新渲染子组件树）

### 2.2 React.lazy + Suspense

```typescript
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const DocumentPage = lazy(() => import('@/pages/DocumentPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
```

**Suspense fallback**：新增 `PageSkeleton` 组件
- 灰色骨架屏：占位矩形块模拟页面布局
- 不需要对应每个页面单独设计 skeleton，用通用布局 skeleton（navbar 占位 + 内容区占位 + sidebar 占位）

**加载策略**：
- 全部页面懒加载（LoginPage 保留同步加载，因为它是入口页面且很小）
- 不区分优先级，按需加载

**Vite 注意事项**：
- Vite 原生支持动态 `import()`，自动拆 chunk
- 不需要额外配置 `rollupOptions.output.manualChunks`

### 2.3 消息操作按钮

#### 2.3.1 复制按钮

- 位置：每条 AI 回答底部右侧（与"重新生成"按钮同行或附近）
- 图标：📋 或使用 CSS 绘制的复制图标
- 点击行为：
  1. 提取消息的纯文本内容（去除 HTML/markdown 标记）
  2. `navigator.clipboard.writeText(text)`
  3. 显示 toast 提示"已复制"

**Toast 组件**：轻量实现，不需要引入第三方库
- 绝对定位，右下角弹出
- "✓ 已复制到剪贴板" + 自动 2 秒消失
- 不阻塞操作

**提取纯文本**：`message.content.replace(/<[^>]*>/g, '')` 去除 HTML 标签

#### 2.3.2 分享按钮

- 位置：复制按钮右侧
- 图标：🔗 或分享图标
- 点击行为：
  1. 构建 URL：`${window.location.origin}/chat?conv=${conversationId}`
  2. `navigator.clipboard.writeText(url)`
  3. 显示 toast "链接已复制"

### 2.4 组件结构

```
App.tsx 改造后：
├── ErrorBoundary
│   └── <Routes>（现有布局）
│       └── Suspense fallback={<PageSkeleton />}
│           ├── Route / → (Redirect to /chat)
│           ├── Route /chat → lazy(ChatPage)
│           ├── Route /documents → lazy(DocumentPage)
│           └── Route /profile → lazy(ProfilePage)

ChatMessage.tsx 改造后（assistant 消息底部）：
├── 错误信息（现有）
├── 幻觉警告（现有）
├── 来源引用（现有）
├── token 信息 / 重新生成按钮行（现有）
│   └── [追加] 复制按钮 + 分享按钮（新）
└── 猜你想问（现有）
```

---

## 3. 实现任务分解

| Task ID | 描述 | 涉及文件 |
|---------|------|----------|
| T-01 | 新建 `ErrorBoundary` 组件 + `ErrorFallback` 组件 | 新建 `ErrorBoundary.tsx`, `ErrorFallback.tsx` + CSS |
| T-02 | `App.tsx` 包裹 ErrorBoundary | `App.tsx` |
| T-03 | 页面级 lazy loading + `PageSkeleton` 组件 | `App.tsx`, 新建 `PageSkeleton.tsx` + CSS |
| T-04 | 消息复制按钮 + 分享按钮 + Toast 组件 | `ChatMessage.tsx`, `ChatMessage.module.css`, 新建 `Toast.tsx` + CSS |
| T-05 | E2E 测试：Error Boundary + 懒加载 + 消息按钮 | 新建 `production-patterns.spec.ts` |

---

## 4. 测试用例（E2E 新增）

### TC-PROD-01：Error Boundary 降级
- **步骤**：访问一个有错误的路由（或通过 mock 让 ChatPage 抛异常）
- **预期**：不白屏，显示 ErrorFallback UI + "重试"按钮

### TC-PROD-02：页面懒加载
- **步骤**：从 Chat 页面导航到 Documents 页面
- **预期**：首次访问 Documents 时，Network 中应有独立的 DocumentPage chunk 加载

### TC-PROD-03：复制消息按钮
- **步骤**：发送消息 → 等待回答完成 → hover 助手消息 → 点击复制按钮
- **预期**：Toast 显示"已复制"，剪贴板中包含回答文本（纯文本，无 HTML 标签）

### TC-PROD-04：分享链接按钮
- **步骤**：发送消息 → 等待回答完成 → 点击分享按钮
- **预期**：Toast 显示"链接已复制"，剪贴板中包含当前对话 URL

---

## 5. 验收标准

- [ ] ErrorBoundary 捕获子组件异常，显示 ErrorFallback + 重试按钮
- [ ] 正常页面不受 ErrorBoundary 影响
- [ ] ChatPage / DocumentPage / ProfilePage 改为 `React.lazy` 加载
- [ ] 页面切换时 Suspense fallback (PageSkeleton) 正常显示
- [ ] 每条 assistant 消息底部有复制按钮和分享按钮
- [ ] 点击复制后 toast 提示"已复制"，剪贴板内容正确
- [ ] 点击分享后 toast 提示"链接已复制"，URL 包含 conversationId
- [ ] 现有 38 个 E2E 测试全部通过（回归）
- [ ] 新增 4 个 E2E 测试全部通过
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

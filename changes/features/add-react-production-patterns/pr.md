## 变更描述

为前端补齐三个 React 生产级核心模式：

1. **Error Boundary**：全局错误降级，组件崩溃时显示友好"页面出错了"界面 + 重试按钮，避免白屏
2. **React.lazy + Suspense**：ChatPage / DocumentPage / ProfilePage 改为懒加载，首屏只加载当前页面 chunk
3. **消息操作按钮**：每条 AI 回答底部增加"复制"按钮（一键复制到剪贴板 + toast 提示）和"重新生成"按钮

三者都是大厂面试高频考点，且改动量小、纯前端、无后端依赖。

## 关联 Task

- **T-01**: 新建 `ErrorBoundary` + `ErrorFallback` 组件
- **T-02**: `App.tsx` 包裹 ErrorBoundary
- **T-03**: 页面级 lazy loading + `PageSkeleton`
- **T-04**: 消息复制按钮 + Toast 组件
- **T-05**: E2E 测试：3 个 production patterns 用例

## 验收标准

### Error Boundary
- [ ] ErrorBoundary 包裹 `<Routes>`，捕获子组件异常
- [ ] 崩溃时显示 ErrorFallback UI（⚠ 图标 + 错误信息 + 重试按钮）
- [ ] 点击重试重新渲染子组件树
- [ ] 正常页面不受影响

### Lazy Loading
- [ ] ChatPage / DocumentPage / ProfilePage 改为 `React.lazy`
- [ ] Suspense fallback 显示 PageSkeleton
- [ ] 构建产物中有独立 chunk（ChatPage*.js / DocumentPage*.js / ProfilePage*.js）
- [ ] LoginPage 保持同步加载（入口页）

### 消息操作按钮
- [ ] 每条 assistant 消息底部有"复制"按钮
- [ ] 点击复制后 toast 显示"已复制"
- [ ] 剪贴板内容为纯文本（去除 HTML 标签）
- [ ] "重新生成"按钮正常显示

### E2E 测试（新增 3 个）
- [ ] TC-PROD-02: 页面懒加载正常工作（Chat → Documents → Profile 导航）
- [ ] TC-PROD-03: 复制消息按钮 + toast 提示
- [ ] TC-PROD-04: 重新生成按钮（回归验证）

### 回归验证
- [ ] `pnpm test` — 全部单元测试通过
- [ ] `pnpm test:e2e` — 41 个测试通过（38 原有 + 3 新增）
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

## Spec 变更

- 新增：`changes/features/add-react-production-patterns/spec.md`、`instruction.md`
- 新增：`apps/web/src/components/Error/`（ErrorBoundary + ErrorFallback + CSS）
- 新增：`apps/web/src/components/Layout/PageSkeleton.tsx` + `.module.css`
- 新增：`apps/web/src/components/Chat/Toast.tsx` + `.module.css`
- 修改：`apps/web/src/App.tsx`（ErrorBoundary + lazy + Suspense）
- 修改：`apps/web/src/components/Chat/ChatMessage.tsx`（复制按钮 + 操作按钮行）
- 修改：`apps/web/src/components/Chat/ChatMessage.module.css`（.messageActions / .actionButton 样式）
- 新增：`apps/web/e2e/specs/production-patterns.spec.ts`

## 审查重点

- ErrorBoundary 是否正确放置在 `<Routes>` 外层（不能放在 AuthenticatedLayout 内部，否则路由级错误无法捕获）
- `React.lazy` 是否使用了 `import()` 动态语法（不能用 top-level await）
- `Suspense` 的位置是否只包裹 `<Routes>`，不影响 hamburger 按钮和 Sidebar
- 复制按钮的 `navigator.clipboard.writeText` 在非 HTTPS 环境下可能失效（localhost 可正常使用，测试环境无影响）
- Toast 的 `document.body.appendChild` 清理是否正确（`setTimeout` 里 `el.remove()` 在组件卸载后仍执行，可能有不干净的 DOM 残留——实际影响极小，2 秒后必然清理）
- `onRegenerate` prop 是否在 ChatPage → ChatMessage 的传递链中正确存在

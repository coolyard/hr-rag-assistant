# Agent 指令：React 生产级模式（Error Boundary + Suspense + 消息操作按钮）

> 【执行纪律】本指令包含 5 个 Task，分为 3 个阶段。严格按照阶段顺序逐一完成，每阶段完成后运行验证通过再进入下一阶段。

---

## 前置阅读（按顺序读）

1. `changes/features/add-react-production-patterns/spec.md`
2. `apps/web/src/App.tsx`
3. `apps/web/src/App.module.css`
4. `apps/web/src/components/Chat/ChatMessage.tsx`（找 regenerate button 区域）
5. `apps/web/src/components/Chat/ChatMessage.module.css`

---

## 阶段 1：Error Boundary（T-01 ~ T-02）

### T-01：新建 ErrorBoundary 和 ErrorFallback 组件

#### 1.1 新建 `apps/web/src/components/Error/ErrorFallback.module.css`

```css
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-primary);
  text-align: center;
  padding: 24px;
}

.icon {
  font-size: 2.5rem;
  margin-bottom: 16px;
}

.title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.message {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 24px 0;
  max-width: 400px;
  line-height: 1.5;
}

.retryButton {
  padding: 8px 24px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s;
}

.retryButton:hover {
  background: var(--hover-bg);
}
```

#### 1.2 新建 `apps/web/src/components/Error/ErrorFallback.tsx`

```tsx
import { type FC } from 'react';
import styles from './ErrorFallback.module.css';

interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
}

export const ErrorFallback: FC<ErrorFallbackProps> = ({ error, onRetry }) => (
  <div className={styles.wrapper}>
    <div className={styles.icon}>⚠️</div>
    <h1 className={styles.title}>页面出错了</h1>
    <p className={styles.message}>{error.message || '发生了未知错误，请重试。'}</p>
    <button className={styles.retryButton} onClick={onRetry} type="button">
      重试
    </button>
  </div>
);
```

#### 1.3 新建 `apps/web/src/components/Error/ErrorBoundary.tsx`

```tsx
import { Component, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
```

### T-02：App.tsx 包裹 ErrorBoundary

编辑 `apps/web/src/App.tsx`：

修改 `App` 组件，在最外层 Routes 外包裹 ErrorBoundary。具体改法：在 `export const App: FC = () => {` 函数体内，把 `<Routes>` 包在 `<ErrorBoundary>` 中：

```tsx
import { ErrorBoundary } from '@/components/Error/ErrorBoundary';

export const App: FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
};
```

### 阶段 1 验证

```bash
cd apps/web && npx tsc --noEmit && pnpm build
```

---

## 阶段 2：React.lazy + Suspense（T-03）

### T-03：页面级 lazy loading + PageSkeleton

#### 3.1 新建 `apps/web/src/components/Layout/PageSkeleton.module.css`

```css
.skeleton {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
}

.navbarPlaceholder {
  height: 48px;
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.contentPlaceholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}
```

#### 3.2 新建 `apps/web/src/components/Layout/PageSkeleton.tsx`

```tsx
import { type FC } from 'react';
import styles from './PageSkeleton.module.css';

export const PageSkeleton: FC = () => (
  <div className={styles.skeleton}>
    <div className={styles.navbarPlaceholder} />
    <div className={styles.contentPlaceholder}>加载中...</div>
  </div>
);
```

#### 3.3 编辑 `apps/web/src/App.tsx`

① 在文件顶部 import 区，新增：

```typescript
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '@/components/Error/ErrorBoundary';
import { PageSkeleton } from '@/components/Layout/PageSkeleton';
```

② 将三个同步 import 改为懒加载：

```typescript
// 删除以下三行：
// import { ChatPage } from '@/pages/ChatPage';
// import { DocumentPage } from '@/pages/DocumentPage';
// import { ProfilePage } from '@/pages/ProfilePage';

// 替换为：
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const DocumentPage = lazy(() => import('@/pages/DocumentPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
```

③ 在 `AuthenticatedLayout` 的 `<main>` 中，把 `<Routes>` 用 `<Suspense>` 包裹：

```tsx
<main className={styles.mainContent}>
  {/* ... hamburger button 不变 ... */}
  <Suspense fallback={<PageSkeleton />}>
    <Routes>
      {/* 现有 Route 不变 */}
    </Routes>
  </Suspense>
</main>
```

> 注意：`Suspense` 只包 `<Routes>`，不要包 `hamburger` 按钮。

### 阶段 2 验证

```bash
cd apps/web && npx tsc --noEmit && pnpm build
```

构建产物中应能看到独立的 chunk 文件（如 `ChatPage*.js`、`DocumentPage*.js`）：

```bash
ls -la apps/web/dist/assets/ | grep -E "Chat|Document|Profile"
```

---

## 阶段 3：消息操作按钮（T-04）

### T-04：复制按钮 + 分享按钮 + Toast

#### 4.1 新建 `apps/web/src/components/Chat/Toast.module.css`

```css
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 10px 20px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.85rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  z-index: 300;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### 4.2 新建 `apps/web/src/components/Chat/Toast.tsx`

```tsx
import { type FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

export function showToast(text: string): void {
  const el = document.createElement('div');
  el.className = styles.toast;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 2000);
}
```

> 不使用 React Portal，用原生 DOM 方式实现——更简单，避免引入额外状态管理。挂载到 `document.body`。

> 注意：因为这个 `showToast` 是纯函数而非 React 组件，不需要导出一个 useToast hook。直接用 `showToast('已复制')` 调用。

#### 4.3 编辑 `apps/web/src/components/Chat/ChatMessage.module.css`

在文件末尾新增：

```css
/* ── 消息操作按钮 ── */

.messageActions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.actionButton {
  padding: 4px 8px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s, border-color 0.15s;
}

.actionButton:hover {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}
```

#### 4.4 编辑 `apps/web/src/components/Chat/ChatMessage.tsx`

① 在文件顶部 import 区新增：

```typescript
import { showToast } from '@/components/Chat/Toast';
```

② 找到 assistant 分支底部的 token、regenerate 区域（参考行号 185-190 附近）。在 `tokenInfo` 和 `regenerateButton` 之后（或之间），新增操作按钮区域：

在 assistant 分支中，`{message.status === 'complete' && message.sources && ...}` 块的**前面**，找到 token 信息和 regenerate 按钮的那一段，把它改造成一个统一的 `.messageActions` 容器：

```tsx
{message.status === 'complete' && (
  <div className={styles.messageActions}>
    {message.promptTokens != null && message.completionTokens != null && (
      <span className={styles.tokenInfo}>~{message.completionTokens} tokens</span>
    )}
    <button
      className={styles.actionButton}
      onClick={() => {
        const text = message.content.replace(/<[^>]*>/g, '');
        void navigator.clipboard.writeText(text).then(() => {
          showToast('✓ 已复制到剪贴板');
        });
      }}
      type="button"
    >
      复制
    </button>
    {onRegenerate && (
      <button
        className={styles.actionButton}
        onClick={() => { onRegenerate(message.id); }}
        type="button"
      >
        重新生成
      </button>
    )}
  </div>
)}
```

> 关键：把原有的独立 tokenInfo、regenerateButton 合并到同一个 `.messageActions` 容器中。如果原来没有 `onRegenerate` prop，需要确认 `ChatMessageProps` 中有没有这个 prop。如果没有，需要新增 `onRegenerate?: (messageId: string) => void`。

> 分享按钮因为需要 conversationId，但在 ChatMessage 中没有这个信息。可用简化处理：使用 `window.location.href` 作为分享链接（如果 URL 中不含 conversationId 参数，则仅复制当前 URL）。

③ 确认 `ChatMessageProps` 接口中有 `onRegenerate` prop。如果没有，在接口中新增：

```typescript
interface ChatMessageProps {
  message: Message;
  onFollowUp?: (question: string) => void;
  onRegenerate?: (messageId: string) => void;  // 确保存在
}
```

### 阶段 3 验证

```bash
cd apps/web && npx tsc --noEmit && pnpm build && pnpm vitest run
```

---

## 阶段 4：E2E 测试（T-05）

### T-05：新增 production patterns E2E 测试

#### 5.1 新建 `apps/web/e2e/specs/production-patterns.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('生产级模式', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
  });

  test('TC-PROD-02: 页面懒加载正常工作', async ({ page }) => {
    // Chat 页面应正常加载
    await page.goto('/chat');
    await expect(page.getByText('有什么可以帮您的？')).toBeVisible({ timeout: 10000 });

    // 跳转到 Documents 页面
    await page.getByText('文档').first().click();
    await expect(page.getByText('文档列表')).toBeVisible({ timeout: 10000 });

    // 跳转到 Profile 页面
    await page.getByText('个人中心').first().click();
    await expect(page.getByText('请假日历')).toBeVisible({ timeout: 10000 });
  });

  test('TC-PROD-03: 复制消息按钮', async ({ page }) => {
    await page.goto('/chat');
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 点击复制按钮
    await page.getByText('复制').click();
    // 验证 toast 出现
    await expect(page.getByText('已复制')).toBeVisible({ timeout: 3000 });
  });

  test('TC-PROD-04: 重新生成按钮', async ({ page }) => {
    await page.goto('/chat');
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 验证重新生成按钮存在（已有功能回归）
    await expect(page.getByText('重新生成')).toBeVisible();
  });
});
```

> TC-PROD-01（Error Boundary 降级）不在 E2E 测试中覆盖——Error Boundary 在 mock 环境下不会触发，需要真实让组件崩溃，Playwright 中难以可靠模拟。改为手动验证：在 ChatPage 中临时写 `throw new Error('test')` 看 ErrorFallback 是否出现。

> 如果 ChatPage 中原本就有 `onRegenerate` prop 且已正确传递，删除 TC-PROD-04 中对 regenerate 的额外验证（避免重复测试）。

### 阶段 4 验证

```bash
pnpm test:e2e
```

---

## 最终验证

```bash
pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e
```

全部通过后提交代码。

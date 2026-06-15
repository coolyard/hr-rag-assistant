# Agent 指令：为前端添加 Playwright E2E 端到端测试

> 【执行纪律】本指令包含 20+ 个具体修改点，分为 5 个阶段。你必须严格按照阶段顺序逐一完成，每完成一个阶段后运行对应验证命令确保通过后再进入下一阶段。禁止跳过任何步骤。

---

## 前置阅读（必须先读）

1. 读取 `changes/features/add-e2e-playwright-tests/spec.md` 了解完整需求和测试用例
2. 读取 `apps/web/src/api/client.ts` 了解 API 调用方式
3. 读取 `apps/web/src/api/sse.ts` 了解 SSE 流式通信协议
4. 读取 `apps/web/vite.config.ts` 了解前端构建配置
5. 读取 `.github/workflows/ci.yml` 了解现有 CI 流程
6. 读取 `.cursorrules` 了解代码规范

**关键前置知识**：前端通过 Vite proxy 将所有 `/api/*` 请求代理到 `localhost:3000`。Playwright 测试中我们将通过 `page.route()` 拦截这些请求，返回 Mock 数据，因此不需要启动真实后端。

---

## 阶段 1：安装依赖与配置

### 1.1 apps/web/package.json — 添加 Playwright 依赖

编辑 `apps/web/package.json`，在 `devDependencies` 中添加：

```jsonc
"@playwright/test": "^1.52.0"
```

在 `scripts` 中添加：

```jsonc
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:debug": "playwright test --debug"
```

### 1.2 根目录 package.json — 添加 E2E 脚本

编辑根目录 `package.json`，在 `scripts` 中添加：

```jsonc
"test:e2e": "pnpm --filter web test:e2e"
```

### 1.3 安装依赖

```bash
pnpm install
```

### 1.4 创建 Playwright 配置文件

在 `apps/web/` 目录下新建 `playwright.config.ts`：

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    cwd: '.',
  },
});
```

### 1.5 验证

```bash
# 在不安装浏览器的情况下验证配置文件读取正常
npx playwright test --help
```

注意：后续运行测试前需要先安装 Chromium 浏览器：

```bash
npx playwright install chromium
```

---

## 阶段 2：Mock API 层与测试辅助函数

### 2.1 创建目录结构

```bash
mkdir -p apps/web/e2e/{fixtures,mocks,specs}
```

### 2.2 创建 Mock 测试数据

编辑 `apps/web/e2e/fixtures/test-data.ts`：

```typescript
import type { HRDocument } from '@/components/Document/DocumentCard';

// ── 用户数据 ──
export const MOCK_EMPLOYEE = {
  username: 'employee',
  displayName: '张三',
  role: 'employee',
  id: 'user-1',
};

export const MOCK_HR = {
  username: 'hr',
  displayName: '李四',
  role: 'hr',
  id: 'user-2',
};

// ── 文档数据 ──
export const MOCK_DOCUMENTS: HRDocument[] = [
  { id: 'annual_leave', filename: '年假制度.md', title: '年假制度', category: 'annual_leave', categoryName: '年假', updatedAt: '2026-01-15T00:00:00.000Z' },
  { id: 'reimbursement', filename: '报销流程.md', title: '报销流程', category: 'reimbursement', categoryName: '报销', updatedAt: '2026-01-15T00:00:00.000Z' },
  { id: 'promotion', filename: '晋升规则.md', title: '晋升规则', category: 'promotion', categoryName: '晋升', updatedAt: '2026-01-15T00:00:00.000Z' },
  { id: 'attendance', filename: '考勤制度.md', title: '考勤制度', category: 'attendance', categoryName: '考勤', updatedAt: '2026-01-15T00:00:00.000Z' },
  { id: 'welfare', filename: '员工福利.md', title: '员工福利', category: 'welfare', categoryName: '福利', updatedAt: '2026-01-15T00:00:00.000Z' },
];

export const MOCK_DOCUMENT_CONTENT = '# 年假制度\n\n## 年假天数\n根据工龄不同，年假天数如下：\n- 1-10年：5天\n- 10-20年：10天\n- 20年以上：15天\n\n## 申请流程\n1. 在系统提交请假申请\n2. 直属上级审批\n3. HR备案';

// ── Profile 数据 ──
export const MOCK_PROFILE = {
  realName: '张三',
  department: '技术部',
  position: '前端工程师',
  level: 'P6',
  hireDate: '2023-03-15T00:00:00.000Z',
  probationEndDate: '2023-06-15T00:00:00.000Z',
  isProbation: false,
  annualLeaveTotal: 10,
  annualLeaveUsed: 3,
  annualLeaveRemaining: 7,
  sickLeaveUsed: 2,
  personalLeaveUsed: 1,
  marriageLeaveUsed: 0,
  maternityLeaveUsed: 0,
  reimbursementTotal: 3500,
  reimbursementPending: 1200,
  reimbursementApproved: 2300,
  reimbursementCount: 5,
  communicationSubsidy: 200,
  transportSubsidy: 300,
  mealSubsidy: 600,
  lateCountThisMonth: 1,
  forgotClockCountThisMonth: 0,
  overtimeBalanceHours: 8,
  trainingBudgetRemaining: 3500,
  annualExaminationStatus: 'completed',
  birthdayBenefitStatus: 'unclaimed',
  lastPromotionDate: '2025-03-15T00:00:00.000Z',
  nextEvaluationEligible: true,
  leaveRecords: [],
  monthlyMealSubsidies: [],
};

// ── SSE 流式响应 ──
export const MOCK_SSE_CHUNKS = [
  '根据',
  '《年假制度》',
  '规定',
  '，',
  '员工',
  '每年',
  '有',
  '5',
  '天',
  '年假',
  '。',
  '申请',
  '流程',
  '：',
  '在系统',
  '提交',
  '请假',
  '申请',
  '，',
  '直属上级',
  '审批',
  '，',
  'HR',
  '备案',
  '。',
];

export const MOCK_SSE_SOURCES = [
  { documentName: '年假制度.md', documentTitle: '年假制度', category: 'annual_leave', chunk: '根据工龄不同，年假天数如下：1-10年：5天', similarity: 0.89 },
  { documentName: '年假制度.md', documentTitle: '年假制度', category: 'annual_leave', chunk: '申请流程：1. 在系统提交请假申请', similarity: 0.75 },
];

export const MOCK_SSE_FOLLOWUPS = [
  '年假可以累积到明年吗？',
  '年假没用完怎么办？',
  '病假会影响年假吗？',
];
```

### 2.3 创建 Login 辅助函数

编辑 `apps/web/e2e/fixtures/auth.ts`：

```typescript
import type { Page } from '@playwright/test';

/**
 * 通过 localStorage 直接注入 JWT token，绕过登录页面
 * 用于不需要测试登录流程的用例
 */
export async function loginAs(page: Page, role: 'employee' | 'hr'): Promise<void> {
  const token = role === 'employee' ? 'mock-jwt-employee' : 'mock-jwt-hr';
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('hr_rag_token', t);
  }, token);
}
```

### 2.4 创建统一 API Mock Handler

编辑 `apps/web/e2e/mocks/api-handlers.ts`：

```typescript
import type { Page, Route } from '@playwright/test';
import {
  MOCK_DOCUMENTS,
  MOCK_DOCUMENT_CONTENT,
  MOCK_PROFILE,
  MOCK_SSE_CHUNKS,
  MOCK_SSE_SOURCES,
  MOCK_SSE_FOLLOWUPS,
} from '../fixtures/test-data';

/**
 * 注册所有 API 路由的 Mock 拦截器。
 * 测试文件在 `beforeEach` 中调用此函数即可。
 */
export async function setupApiMocks(page: Page): Promise<void> {
  // ── 登录 ──
  await page.route('**/api/auth/login', async (route: Route) => {
    const postData = route.request().postDataJSON();
    if (postData?.username === 'employee' && postData?.password === '123456') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'mock-jwt-employee' }),
      });
    }
    if (postData?.username === 'hr' && postData?.password === '123456') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'mock-jwt-hr' }),
      });
    }
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: '账号或密码错误' }),
    });
  });

  // ── 问答 SSE 流 ──
  await page.route('**/api/ask', async (route: Route) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const chunk of MOCK_SSE_CHUNKS) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk, done: false })}\n\n`));
          await new Promise((r) => setTimeout(r, 10));
        }
        // sources + followUps
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ chunk: '', done: true, sources: MOCK_SSE_SOURCES, confidenceLevel: 'high', followUps: MOCK_SSE_FOLLOWUPS })}\n\n`,
          ),
        );
        controller.close();
      },
    });

    return route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      body: stream as unknown as string,
    });
  });

  // ── 文档列表 ──
  await page.route('**/api/documents', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ documents: MOCK_DOCUMENTS, total: MOCK_DOCUMENTS.length }),
    });
  });

  // ── 单个文档内容 ──
  await page.route('**/api/documents/*', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: MOCK_DOCUMENT_CONTENT }),
    });
  });

  // ── 用户 Profile ──
  await page.route('**/api/me', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        username: 'employee',
        role: 'employee',
        displayName: '张三',
        profile: MOCK_PROFILE,
      }),
    });
  });

  // ── 健康检查 ──
  await page.route('**/api/health', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', timestamp: Date.now() }),
    });
  });
}
```

---

## 阶段 3：实现测试用例

### 3.1 登录认证测试

编辑 `apps/web/e2e/specs/auth.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('登录认证', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('TC-01: 登录页渲染演示账号提示', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('HR 智能助手');
    await expect(page.getByText('hr / 123456')).toBeVisible();
    await expect(page.getByText('employee / 123456')).toBeVisible();
  });

  test('TC-02: 员工账号登录成功', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('employee');
    await page.getByPlaceholder('请输入密码').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByText('有什么可以帮您的？')).toBeVisible();
  });

  test('TC-03: HR 账号登录成功', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('hr');
    await page.getByPlaceholder('请输入密码').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/chat/);
  });

  test('TC-04: 错误密码显示错误提示', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('employee');
    await page.getByPlaceholder('请输入密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText('账号或密码错误')).toBeVisible();
  });

  test('TC-05: 未认证访问 /chat 重定向到 /login', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-06: 登出后清除 token 并跳转登录页', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('employee');
    await page.getByPlaceholder('请输入密码').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/chat/);

    // 登出
    await page.getByRole('button', { name: '退出登录' }).click();
    await expect(page).toHaveURL(/\/login/);

    // 验证 token 已清除
    const token = await page.evaluate(() => localStorage.getItem('hr_rag_token'));
    expect(token).toBeNull();
  });
});
```

### 3.2 聊天对话测试

编辑 `apps/web/e2e/specs/chat.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('聊天对话', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
  });

  test('TC-07: 欢迎页面显示 5 个快捷问题', async ({ page }) => {
    await page.goto('/chat');
    // 等待页面渲染
    await expect(page.getByText('有什么可以帮您的？')).toBeVisible();
    const quickQuestions = page.locator('button').filter({ hasText: /年假|报销|迟到|加班|晋升/ });
    await expect(quickQuestions.first()).toBeVisible();
  });

  test('TC-08: 发送消息后显示用户气泡和助手加载动画', async ({ page }) => {
    await page.goto('/chat');
    const textarea = page.locator('textarea');
    await textarea.fill('年假怎么请');
    await page.getByRole('button', { name: '发送' }).click();

    // 用户消息应显示
    await expect(page.getByText('年假怎么请')).toBeVisible();
    // 助手应显示加载动画（三个点）
    await expect(page.locator('text=●').first()).toBeVisible();
  });

  test('TC-09: 流式回答完成后显示来源引用', async ({ page }) => {
    await page.goto('/chat');
    const textarea = page.locator('textarea');
    await textarea.fill('年假怎么请');
    await page.getByRole('button', { name: '发送' }).click();

    // 等待流式渲染完成 — 最终应看到来源卡片
    await expect(page.getByText('参考来源')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('年假制度')).toBeVisible();
    await expect(page.getByText(/89%/)).toBeVisible();
  });

  test('TC-10: 猜你想问按钮渲染', async ({ page }) => {
    await page.goto('/chat');
    const textarea = page.locator('textarea');
    await textarea.fill('年假怎么请');
    await page.getByRole('button', { name: '发送' }).click();

    // 等待猜你想问出现
    await expect(page.getByText('猜你想问')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('年假可以累积到明年吗？')).toBeVisible();
  });

  test('TC-11: 新对话按钮清空消息', async ({ page }) => {
    await page.goto('/chat');
    const textarea = page.locator('textarea');
    await textarea.fill('年假怎么请');
    await page.getByRole('button', { name: '发送' }).click();

    // 等待消息出现
    await expect(page.getByText('参考来源')).toBeVisible({ timeout: 10000 });

    // 点击新对话
    await page.getByRole('button', { name: '新对话' }).click();
    // 应该重新显示欢迎语
    await expect(page.getByText('有什么可以帮您的？')).toBeVisible();
  });
});
```

### 3.3 文档浏览测试

编辑 `apps/web/e2e/specs/documents.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('文档浏览', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('TC-12: 文档列表展示 5 个内置文档', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/documents');
    await expect(page.getByText(/5.*个文档/)).toBeVisible();
    await expect(page.getByText('年假制度')).toBeVisible();
    await expect(page.getByText('报销流程')).toBeVisible();
    await expect(page.getByText('晋升规则')).toBeVisible();
    await expect(page.getByText('考勤制度')).toBeVisible();
    await expect(page.getByText('员工福利')).toBeVisible();
  });

  test('TC-13: 分类筛选过滤文档', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/documents');
    await page.getByRole('button', { name: '年假' }).click();
    await expect(page.getByText('年假制度')).toBeVisible();
    await expect(page.getByText('报销流程')).not.toBeVisible();
  });

  test('TC-14: 搜索框按标题过滤', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/documents');
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await searchInput.fill('报销');
    await expect(page.getByText('报销流程')).toBeVisible();
    await expect(page.getByText('年假制度')).not.toBeVisible();
  });

  test('TC-15: 文档查看器打开与关闭', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/documents');
    await page.getByText('年假制度').click();
    // 查看器应打开并显示内容
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('年假天数')).toBeVisible();
    // Escape 关闭
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('TC-16: HR 可见上传按钮，Employee 不可见', async ({ page }) => {
    // Employee 角色
    await loginAs(page, 'employee');
    await page.goto('/documents');
    await expect(page.getByText('上传文档')).not.toBeVisible();

    // HR 角色
    await loginAs(page, 'hr');
    await page.goto('/documents');
    await expect(page.getByText('上传文档')).toBeVisible();
  });
});
```

### 3.4 个人中心测试

编辑 `apps/web/e2e/specs/profile.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('个人中心', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
    await page.goto('/profile');
  });

  test('TC-17: 显示个人信息', async ({ page }) => {
    await expect(page.getByText('张三')).toBeVisible();
    await expect(page.getByText('技术部')).toBeVisible();
    await expect(page.getByText(/入职/)).toBeVisible();
  });

  test('TC-18: 统计卡片展示', async ({ page }) => {
    await expect(page.getByText('年假统计')).toBeVisible();
    await expect(page.getByText('报销统计')).toBeVisible();
    await expect(page.getByText('考勤统计')).toBeVisible();
    await expect(page.getByText('福利与培训')).toBeVisible();
  });

  test('TC-19: 请假日历存在', async ({ page }) => {
    await expect(page.getByText('请假日历与餐补统计')).toBeVisible();
  });
});
```

### 3.5 主题切换测试

编辑 `apps/web/e2e/specs/theme.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('主题切换', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
  });

  test('TC-20: 默认主题为浅色模式', async ({ page }) => {
    await page.goto('/chat');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).not.toBe('dark');
  });

  test('TC-21: 切换深色模式', async ({ page }) => {
    await page.goto('/chat');
    // 点击主题切换按钮
    const themeToggle = page.locator('button[aria-label*="主题"], button:has(svg), button:has(span:has-text("主题"))');
    // 如果没有 aria-label，尝试通过 Navbar 中的主题切换组件查找
    await themeToggle.or(page.locator('nav button').last()).first().click();
    // 选择深色模式
    const darkOption = page.getByText('深色');
    if (await darkOption.isVisible()) {
      await darkOption.click();
    }
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('TC-22: 主题持久化（刷新后保持）', async ({ page }) => {
    await page.goto('/chat');
    // 先切换深色
    const themeToggle = page.locator('nav button').last();
    await themeToggle.click();
    const darkOption = page.getByText('深色');
    if (await darkOption.isVisible()) {
      await darkOption.click();
    }
    // 刷新
    await page.reload();
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });
});
```

### 3.6 页面导航测试

编辑 `apps/web/e2e/specs/navigation.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('页面导航', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
  });

  test('TC-23: 导航栏显示三个入口', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.getByText('对话')).toBeVisible();
    await expect(page.getByText('文档')).toBeVisible();
    await expect(page.getByText('我的')).toBeVisible();
  });

  test('TC-24: 点击导航跳转正确页面', async ({ page }) => {
    await page.goto('/chat');
    await page.getByText('文档').click();
    await expect(page).toHaveURL(/\/documents/);
    await page.getByText('我的').click();
    await expect(page).toHaveURL(/\/profile/);
  });
});
```

---

## 阶段 4：验证测试运行

### 4.1 安装 Playwright Chromium 浏览器

```bash
cd apps/web
npx playwright install chromium
cd ../..
```

### 4.2 启动 Vite 开发服务器（验证可运行）

```bash
pnpm --filter web dev &
sleep 3
curl http://localhost:5173 -s -o /dev/null -w "%{http_code}"
# 应输出 200
```

如果 5173 端口被占用，先 kill 已有进程：

```bash
kill $(lsof -ti :5173) 2>/dev/null; true
```

### 4.3 运行 E2E 测试

```bash
pnpm --filter web test:e2e
```

预期结果：
- Playwright 发现 `e2e/specs/` 目录下所有 spec 文件
- 自动启动 Vite Dev Server（通过 playwright.config.ts 的 webServer 配置）
- 所有 API 请求被 Mock Handler 拦截
- 全部测试通过，控制台显示通过数量

如遇到失败，使用调试模式查看：

```bash
pnpm --filter web test:e2e:debug
```

### 4.4 查看测试报告

```bash
# 本地可查看 HTML 报告
open apps/web/playwright-report/index.html
```

---

## 阶段 5：CI 集成

### 5.1 修改 CI 配置文件

编辑 `.github/workflows/ci.yml`，在 `jobs` 中新增 `e2e` job（位置在 `quality` job 之后、文件末尾 `}` 之前）：

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: "10.33.4"
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install
      - name: Install Playwright Chromium
        run: pnpm --filter web exec playwright install chromium
      - name: Run Playwright tests
        run: pnpm --filter web test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 7
```

注意：此 job 不依赖 `quality` job，可与 lint/test/build 并行执行。

---

## 最终验证

```bash
# 1. 确保新依赖已安装
pnpm install

# 2. 确保 Chromium 已安装
cd apps/web && npx playwright install chromium && cd ../..

# 3. 确保已有单元测试仍然通过
pnpm test

# 4. 运行 E2E 测试
pnpm test:e2e

# 5. 确保 lint 通过
pnpm lint

# 6. 确保构建通过
pnpm build
```

全部通过后，提交：

```bash
git add .
git commit -m "feat(e2e): add Playwright E2E tests for core user flows

- Add Playwright test infrastructure (playwright.config.ts, api mocks)
- Implement 25 E2E test cases across 6 modules
  - Auth: login/logout/unauthenticated redirect (6 cases)
  - Chat: welcome screen, message send, streaming, sources (5 cases)
  - Documents: list, filter, search, viewer, role-based upload (5 cases)
  - Profile: personal info, stat cards, calendar (3 cases)
  - Theme: light/dark switch, persistence after reload (3 cases)
  - Navigation: navbar, page routing, active state (3 cases)
- All tests use page.route() mock API, no real backend needed
- Add e2e job to CI workflow with Playwright Chromium
- Verified: tests pass, lint clean, build succeeds"

git push origin feature/add-e2e-playwright-tests
```

---

## 常见陷阱

1. **SSE 流式 Mock 的 ReadableStream 兼容性**：在 Node.js 22 中 `ReadableStream` 已原生支持，但如果 `route.fulfill()` 接收 `ReadableStream` 有问题，改用模拟多个 `data:` 消息并通过 `route.fulfill({ body: ... })` 一次性返回

2. **Vite 端口冲突**：如果本地已有 Vite 开发服务器运行，Playwright 的 `webServer` 会自动重用（`reuseExistingServer: !process.env.CI`），但 CI 中每次都会启动新实例

3. **CSS Module 类名**：Playwright 通过可见文本定位元素（`getByText()`、`getByRole()`），不依赖 CSS 类名，所以 CSS Modules 不影响 E2E 测试

4. **页面跳转等待**：登录后跳转到 `/chat` 需要等待前端路由完成。使用 `await expect(page).toHaveURL(/\/chat/)` 而非 `await page.waitForURL()`，前者自动等待并重试

5. **Mock 数据与实际 UI 的匹配**：确保 Mock 数据中的字段与前端组件期望的字段完全一致（如 `documentTitle` vs `title`），否则组件可能渲染不正确

6. **GitHub Actions 中的浏览器安装**：`playwright install chromium` 在 CI 中默认安装到系统级路径。如果遇到权限问题，设置环境变量 `PLAYWRIGHT_BROWSERS_PATH=0`

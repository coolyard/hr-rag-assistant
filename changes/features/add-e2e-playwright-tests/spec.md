# Feature Spec：为前端添加 Playwright E2E 端到端测试

> 本 Feature 为前端应用添加 Playwright 端到端测试，覆盖登录、聊天、文档浏览、个人中心、主题切换、导航等核心用户流程。测试采用 Mock API 模式，不依赖真实后端/Ollama 服务，可在 CI 中独立运行。
>
> 对应模块：auth-spec.md、chat-spec.md、document-spec.md、user-profile-spec.md、theme-spec.md、api-spec.md
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前项目已有 [Vitest 单元测试](/Users/work/learn/hr-rag-assistant/apps/web/src) 覆盖组件渲染和工具函数逻辑，但缺少**端到端的用户流程测试**。核心功能如登录流程、多轮对话、文档浏览、主题切换等在真实浏览器环境中的正确性无法通过单元测试验证。

作为面试演示项目，增加 Playwright E2E 测试能显著提升项目的工程化完整度，展示候选人对**前端质量保障体系**的理解。

### 1.2 目标

1. **搭建 Playwright 测试基础设施**：配置 Playwright、测试基境（fixtures）、Mock API 层
2. **Mock 优先策略**：所有测试拦截前端 API 调用返回模拟数据，不依赖真实后端
3. **覆盖核心用户流程**：登录、聊天、文档、个人中心、主题、导航 6 大模块
4. **CI 集成**：在 GitHub Actions 中安装 Playwright 浏览器并执行 E2E 测试
5. **视觉验证**：对关键页面进行截图对比（可选，v1 先不做）

### 1.3 明确不做

- ❌ 视觉回归测试（`playwright-visual`）—— 先确保功能覆盖
- ❌ 跨浏览器测试 —— v1 仅 Chromium，后续可扩展 Firefox/WebKit
- ❌ 移动端/响应式测试 —— v1 仅桌面 1280×720 视口
- ❌ 真实后端集成测试 —— 全部使用 Mock API
- ❌ 性能/压力测试

### 1.4 测试范围与优先级

| 优先级 | 模块 | 测试场景数 | 核心验证点 |
|--------|------|-----------|-----------|
| P0 | 登录认证 | 5 | 登录成功/失败/未认证跳转/登出/凭证提示 |
| P0 | 聊天对话 | 5 | 发送消息/流式渲染/来源引用/猜你想问/新对话 |
| P0 | 文档浏览 | 5 | 文档列表/分类筛选/搜索/文档查看器/上传按钮 |
| P1 | 个人中心 | 3 | 个人信息/统计卡片/日历导航 |
| P1 | 主题切换 | 3 | 浅色/深色/跟随系统/持久化 |
| P1 | 页面导航 | 3 | 导航栏跳转/高亮状态/路由守卫 |

---

## 2. 技术方案

### 2.1 框架选择

| 项目 | 选择 | 原因 |
|------|------|------|
| Runner | Playwright 1.52+ | 微软维护，原生 TypeScript 支持，自动等待 |
| Assertion | Playwright Test Assertions | 内置 `expect(locator).toBeVisible()` 等 |
| Mock API | `page.route()` | 拦截所有 `/api/*` 请求，返回模拟 JSON/SSE |
| Reporter | `list` (CI) / `html` (本地) | CI 中简洁输出，本地可查看 HTML 报告 |
| 浏览器 | Chromium (headless) | v1 仅 Chromium，CI 中运行最快 |
| 视口 | 1280×720 (桌面) | v1 固定视口 |

### 2.2 架构设计

```
playwright 测试运行时
    │
    ├── Vite Dev Server (port 5173) ← 由 Playwright webServer 自动启动
    │       │
    │       └── 前端页面 (React SPA)
    │
    ├── Playwright Test Runner
    │       │
    │       ├── 测试脚本访问 http://localhost:5173
    │       ├── page.route() 拦截所有 /api/* 请求
    │       │   ├── /api/auth/login → 返回模拟 JWT
    │       │   ├── /api/ask → 返回模拟 SSE 流
    │       │   ├── /api/documents → 返回模拟文档列表
    │       │   ├── /api/documents/:id → 返回模拟文档内容
    │       │   ├── /api/me → 返回模拟用户 Profile
    │       │   └── /api/health → 返回 200
    │       └── 断言页面 UI 状态
    │
    └── 测试结束后自动关闭 Vite Server
```

### 2.3 测试用户与凭据

| 用户 | 用户名 | 密码 | role | JWT sub |
|------|--------|------|------|---------|
| HR 专员 | hr | 123456 | hr | user-2 |
| 普通员工 | employee | 123456 | employee | user-1 |

---

## 3. 测试用例详细设计

### 3.1 登录认证 (auth.spec.ts)

```
TC-01: 登录页渲染
  Given 用户访问 /login
  Then 应显示"HR 智能助手"标题
  And 应显示演示账号提示（hr / employee）

TC-02: 员工登录成功
  When 输入 employee / 123456 点击登录
  Then 应跳转到 /chat
  And 应显示"有什么可以帮您的？"欢迎语

TC-03: HR 登录成功
  When 输入 hr / 123456 点击登录
  Then 应跳转到 /chat

TC-04: 错误密码
  When 输入 employee / wrong 点击登录
  Then 应显示错误提示信息

TC-05: 未认证访问保护
  Given 清除 localStorage 中的 token
  When 访问 /chat
  Then 应重定向到 /login

TC-06: 登出
  Given 已登录状态
  When 点击退出登录
  Then 应跳转到 /login
  And localStorage 中应无 token
```

### 3.2 聊天对话 (chat.spec.ts)

```
TC-07: 欢迎页面显示快捷问题
  Given 用户已登录且无对话历史
  Then 应显示 5 个快捷问题按钮

TC-08: 发送消息
  When 用户输入问题并发送
  Then 应显示用户消息气泡
  And 应显示助手加载动画

TC-09: 流式渲染模拟
  Given 后端返回模拟 SSE 流
  Then 助手消息应逐字增加
  And 流式光标应显示

TC-10: 来源引用展示
  Given 模拟 SSE 流包含 sources
  Then 回答完成后应显示来源引用卡片
  And 卡片应显示文档名和相似度

TC-11: 猜你想问
  Given 模拟 SSE 流包含 followUps
  Then 应显示 3 个猜测问题按钮
  When 点击猜测问题
  Then 应自动发送该问题
```

### 3.3 文档浏览 (documents.spec.ts)

```
TC-12: 文档列表展示
  Given 用户已登录
  When 导航到 /documents
  Then 应显示 5 个内置文档卡片
  And 应显示"总计 5 个文档"统计

TC-13: 分类筛选
  When 点击"年假"分类按钮
  Then 应只显示年假相关文档
  When 点击"全部"分类按钮
  Then 应显示所有文档

TC-14: 文档搜索
  When 在搜索框输入"报销"
  Then 应只显示匹配的文档

TC-15: 文档查看器
  When 点击文档卡片
  Then 应打开抽屉式查看器
  And 应显示文档 Markdown 内容
  When 按 Escape 键
  Then 查看器应关闭

TC-16: HR 上传按钮可见性
  Given 以 HR 角色登录
  Then 应显示"上传文档"按钮
  Given 以 Employee 角色登录
  Then 应不显示"上传文档"按钮
```

### 3.4 个人中心 (profile.spec.ts)

```
TC-17: 个人信息展示
  Given 用户已登录
  When 导航到 /profile
  Then 应显示用户姓名和部门
  And 应显示入职日期和入职时长

TC-18: 统计卡片
  Then 应显示年假统计卡片（总天数/已休/剩余）
  And 应显示报销统计卡片
  And 应显示考勤统计卡片
  And 应显示福利与培训卡片

TC-19: 请假日历导航
  Then 应显示请假日历
  When 切换月份
  Then 日历应更新
```

### 3.5 主题切换 (theme.spec.ts)

```
TC-20: 浅色模式
  Given 主题设置为浅色
  Then body 应无 data-theme 属性或 data-theme="light"
  And 背景色应为白色系

TC-21: 深色模式
  When 切换为深色模式
  Then data-theme 应为 "dark"
  And 背景色应为深色系

TC-22: 主题持久化
  When 切换为深色模式
  When 刷新页面
  Then 主题仍为深色模式
```

### 3.6 页面导航 (navigation.spec.ts)

```
TC-23: 导航栏
  Given 用户已登录
  Then 导航栏应显示"对话""文档""我的"三个入口

TC-24: 导航跳转
  When 点击"文档"
  Then 地址栏应为 /documents
  When 点击"我的"
  Then 地址栏应为 /profile

TC-25: 高亮状态
  Given 当前在 /chat 页面
  Then "对话"链接应高亮
  When 导航到 /documents
  Then "文档"链接应高亮
```

---

## 4. 文件结构

```
apps/web/e2e/
├── playwright.config.ts          ← Playwright 配置（webServer、路径别名等）
├── global-setup.ts               ← 全局 setup（可选，如启动 mock server）
├── fixtures/
│   ├── auth.ts                   ← 登录辅助函数
│   └── test-data.ts              ← Mock 数据定义
├── specs/
│   ├── auth.spec.ts              ← 登录认证测试
│   ├── chat.spec.ts              ← 聊天对话测试
│   ├── documents.spec.ts         ← 文档浏览测试
│   ├── profile.spec.ts           ← 个人中心测试
│   ├── theme.spec.ts             ← 主题切换测试
│   └── navigation.spec.ts        ← 页面导航测试
└── mocks/
    └── api-handlers.ts           ← 统一的 API Mock 处理器
```

---

## 5. 配置变更

### 5.1 apps/web/package.json 新增

```jsonc
{
  "devDependencies": {
    "@playwright/test": "^1.52.0"
  },
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### 5.2 根目录 package.json 新增

```jsonc
{
  "scripts": {
    "test:e2e": "pnpm --filter web test:e2e"
  }
}
```

### 5.3 CI 变更（新增 e2e job）

```yaml
# 在 .github/workflows/ci.yml 中新增 job
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

---

## 6. Mock API 设计

### 6.1 核心原则

- 所有 `/api/*` 请求通过 `page.route()` 拦截
- Mock 数据放在 `apps/web/e2e/fixtures/test-data.ts` 中集中管理
- API handler 逻辑放在 `apps/web/e2e/mocks/api-handlers.ts` 中
- 每个测试文件通过 `test.use()` 注入自定义路由或使用默认 handler

### 6.2 Mock 数据定义

```typescript
// fixtures/test-data.ts 中的数据
export const MOCK_USERS = {
  employee: { username: 'employee', password: '123456', token: 'mock-jwt-employee', role: 'employee' },
  hr: { username: 'hr', password: '123456', token: 'mock-jwt-hr', role: 'hr' },
};

export const MOCK_DOCUMENTS = [
  { id: 'annual_leave', filename: '年假制度.md', title: '年假制度', category: 'annual_leave', categoryName: '年假', updatedAt: '2026-01-15T00:00:00.000Z' },
  { id: 'reimbursement', filename: '报销流程.md', title: '报销流程', category: 'reimbursement', categoryName: '报销', updatedAt: '2026-01-15T00:00:00.000Z' },
  { id: 'promotion', filename: '晋升规则.md', title: '晋升规则', category: 'promotion', categoryName: '晋升', updatedAt: '2026-01-15T00:00:00.000Z' },
  { id: 'attendance', filename: '考勤制度.md', title: '考勤制度', category: 'attendance', categoryName: '考勤', updatedAt: '2026-01-15T00:00:00.000Z' },
  { id: 'welfare', filename: '员工福利.md', title: '员工福利', category: 'welfare', categoryName: '福利', updatedAt: '2026-01-15T00:00:00.000Z' },
];

export const MOCK_DOCUMENT_CONTENT = '# 年假制度\n\n## 年假天数\n根据工龄...';

export const MOCK_PROFILE = { ... }; // 完整的 UserProfile mock

export const MOCK_SSE_RESPONSE = [
  { chunk: '根据', done: false },
  { chunk: '年假制度', done: false },
  // ...
  { chunk: '', done: true, sources: [...], confidenceLevel: 'high' },
];
```

### 6.3 API Handler 注册

```typescript
// mocks/api-handlers.ts
export async function setupApiMocks(page: Page) {
  // 登录
  await page.route('**/api/auth/login', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.username === 'employee' && body.password === '123456') {
      return route.fulfill({ status: 200, body: JSON.stringify({ access_token: 'mock-jwt-employee' }) });
    }
    return route.fulfill({ status: 401, body: JSON.stringify({ message: '账号或密码错误' }) });
  });

  // 问答 SSE
  await page.route('**/api/ask', async (route) => {
    // 返回模拟 SSE 流
  });

  // 文档列表
  await page.route('**/api/documents', async (route) => {
    return route.fulfill({ status: 200, body: JSON.stringify({ documents: MOCK_DOCUMENTS, total: 5 }) });
  });

  // 健康检查
  await page.route('**/api/health', async (route) => {
    return route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) });
  });
}
```

---

## 7. 验收标准

### 7.1 功能验收

- [ ] `pnpm --filter web test:e2e` 可成功运行，Playwright 发现并执行所有 spec 文件
- [ ] 所有测试使用 `page.route()` 拦截后端 API，不发起真实 HTTP 请求
- [ ] 测试运行时 Vite Dev Server 自动启动（由 Playwright webServer 配置管理）
- [ ] 测试完成后 Vite Dev Server 自动关闭
- [ ] Playwright Chromium 浏览器安装正确（可通过 `npx playwright install chromium`）

### 7.2 用例验收

- [ ] **登录认证（6 个用例）**: 登录页渲染、员工登录、HR 登录、密码错误、未认证跳转、登出
- [ ] **聊天对话（5 个用例）**: 欢迎页快捷问题、发送消息、流式渲染、来源引用、猜你想问
- [ ] **文档浏览（5 个用例）**: 文档列表、分类筛选、搜索、查看器、上传按钮权限
- [ ] **个人中心（3 个用例）**: 个人信息、统计卡片、日历导航
- [ ] **主题切换（3 个用例）**: 浅色/深色切换、持久化刷新
- [ ] **页面导航（3 个用例）**: 导航栏渲染、页面跳转、高亮状态

### 7.3 CI 验收

- [ ] CI 中 e2e job 在 `pnpm install` 后安装 Playwright Chromium 并执行测试
- [ ] CI 中测试失败时自动上传 Playwright 报告作为 Artifact
- [ ] 所有测试在无头模式下正常运行，总执行时间 < 60 秒

---

## 8. 依赖关系

```
add-e2e-playwright-tests
  ├── 前置：全部 Phase 1-3 完成（已有代码）
  ├── 前置：Vite Dev Server 可在 5173 端口正常启动
  ├── 前置：apps/web/src/ 页面代码完整
  └── 后置：无
```

---

## 9. Spec 演进记录

| 日期 | 版本 | 变更内容 | 变更人 |
|------|------|---------|--------|
| 2026-06-15 | v1.0 | 初始版本，定义 E2E 测试范围、Mock 方案、CI 集成 | — |

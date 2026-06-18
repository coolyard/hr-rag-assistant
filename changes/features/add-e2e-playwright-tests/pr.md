## 变更描述

为前端应用添加 Playwright 端到端测试，覆盖登录认证、聊天对话、文档浏览、个人中心、主题切换、页面导航 6 大核心用户流程，共 25 个测试用例。所有测试使用 `page.route()` 拦截后端 API 请求返回模拟数据，不依赖真实后端/Ollama 服务，可在 CI 中独立运行。

## 关联 Task

- **Task-E2E-01**: 搭建 Playwright 基础设施（playwright.config.ts、Mock API 层、测试辅助函数）
- **Task-E2E-02**: 实现 6 个测试模块，共 25 个 E2E 测试用例
- **Task-E2E-03**: 集成到 CI workflow（新增 e2e job + Chromium 安装 + 失败报告上传）

## 验收标准

### 配置文件

- [ ] `apps/web/playwright.config.ts` — 配置 webServer 自动启动 Vite、1280×720 视口、list reporter(CI)/html(本地)
- [ ] `apps/web/e2e/mocks/api-handlers.ts` — 统一拦截登录/SSE/文档/Profile/Health 全部 API
- [ ] `apps/web/e2e/fixtures/test-data.ts` — 5 个 Mock 文档、完整 UserProfile、SSE 流式分片数据
- [ ] `apps/web/e2e/fixtures/auth.ts` — loginAs 辅助函数(通过 localStorage 注入 JWT)

### 测试用例（共 25 个）

- [ ] **登录认证（6 个）**: 登录页渲染、Employee 登录成功、HR 登录成功、密码错误提示、未认证跳转、登出清 token
- [ ] **聊天对话（5 个）**: 欢迎页快捷问题、消息发送与加载动画、流式来源引用、猜你想问、新对话清空
- [ ] **文档浏览（5 个）**: 文档列表展示、分类筛选、搜索过滤、查看器打开/关闭、HR/Employee 上传按钮权限
- [ ] **个人中心（3 个）**: 个人信息展示、统计卡片、请假日历存在
- [ ] **主题切换（3 个）**: 浅色模式、深色模式切换、刷新后持久化
- [ ] **页面导航（3 个）**: 导航栏入口、点击跳转 URL

### CI

- [ ] `.github/workflows/ci.yml` 中新增 e2e job，与 quality job 并行
- [ ] CI 中安装 Playwright Chromium（`npx playwright install chromium`）
- [ ] 测试失败时自动上传 `playwright-report/` 为 GitHub Artifact
- [ ] 所有测试在无头模式下通过，总执行时间 < 60 秒

### 本地验证

- [ ] `pnpm install` — 安装 @playwright/test 无报错
- [ ] `cd apps/web && npx playwright install chromium` — 浏览器安装成功
- [ ] `pnpm test:e2e` — 25 个测试全部通过，控制台无报错
- [ ] `pnpm lint` — lint 0 error
- [ ] `pnpm build` — 构建成功

## Spec 变更

- 新增：`changes/features/add-e2e-playwright-tests/spec.md`（Feature Spec）
- 新增：`changes/features/add-e2e-playwright-tests/instruction.md`（Agent 执行指令）
- 修改：`apps/web/package.json`（添加 @playwright/test 依赖和 test:e2e 脚本）
- 修改：`package.json`（添加根目录 test:e2e 脚本）
- 修改：`.github/workflows/ci.yml`（新增 e2e job）

## 测试方式

1. `pnpm install` — 安装依赖（含 @playwright/test）
2. `cd apps/web && npx playwright install chromium && cd ../..` — 安装浏览器
3. `pnpm test:e2e` — 运行全部 25 个 E2E 测试
4. `pnpm test` — 确保已有单元测试不受影响
5. `pnpm lint && pnpm build` — 确保 lint 和构建无回归

## 审查重点

- SSE 流式 Mock 的实现方式：ReadableStream 在 route.fulfill 中的兼容性
- 主题切换测试中查找主题切换按钮的选择器是否足够稳健（不依赖特定图标文本）
- Mock 数据字段与前端组件期望字段的一致性（如 `documentTitle` vs `title`）
- 文档查看器关闭测试中 `getByRole('dialog')` 是否匹配实际的 Modal/Drawer role
- Playwright webServer 配置中的 `cwd` 是否正确指向 `apps/web/`
- CI 中的 Playwright 浏览器安装命令是否正确使用 `pnpm --filter web exec playwright install chromium`

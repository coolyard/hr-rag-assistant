# Phase 3 Tasks — 用户交互体验

## Task Execution Order

```
Phase 1 + Phase 2 (全部完成)
    │
    ├── Task-007 (Theme 系统) ── 独立，仅需前端项目结构 (Task-001)
    │
    ├── Task-008 (登录认证) ── 依赖 Task-001 (后端骨架)
    │
    └── Task-009 (文档浏览+上传) ── 依赖 Task-003 (文档加载) + Task-008 (JWT + 角色守卫)
```

> Task-007、Task-008 可并行执行。Task-009 必须在 Task-008 完成后执行（需要角色守卫）。

---

## Task-007: Theme 系统（深色/浅色模式）

- **目标**：实现全局 Theme 切换，持久化到 localStorage
- **输入**：ARCHITECTURE.md ADR-006
- **输出**：
  - `apps/web/src/context/ThemeContext.tsx`
  - `apps/web/src/styles/variables.css`
  - `apps/web/src/components/Theme/ThemeToggle.tsx`
- **验收标准**：
  - [ ] 点击切换按钮，Theme 即时切换，无闪烁
  - [ ] 刷新页面后保持上次选择的 Theme
  - [ ] system 模式跟随操作系统偏好
  - [ ] 深色模式下文档阅读区对比度舒适
- **预计耗时**：2-3 小时

## Task-008: Fake 登录系统（JWT + 角色）

- **目标**：实现内存预置账号登录，JWT 鉴权，区分员工/HR 角色
- **输入**：ARCHITECTURE.md ADR-004、PRD.md 登录流
- **输出**：
  - `apps/api/src/auth/auth.service.ts`
  - `apps/api/src/auth/auth.controller.ts`
  - `apps/api/src/auth/jwt.strategy.ts`
  - `apps/api/src/auth/roles.guard.ts`
  - `apps/web/src/pages/LoginPage.tsx`
  - `apps/web/src/context/AuthContext.tsx`
- **预置账号**：
  - `employee / 123456` — 角色 `employee`
  - `hr / 123456` — 角色 `hr`
- **验收标准**：
  - [ ] 输入正确账号，返回 JWT Token，前端存储到 LocalStorage
  - [ ] 未登录访问 `/chat` 自动跳转 `/login`
  - [ ] Token 失效后，前端自动跳转登录页
  - [ ] 所有 `/api/ask` 请求必须携带有效 JWT
- **预计耗时**：3-4 小时

## Task-009: 文档浏览 + 上传页面

- **目标**：实现文档列表、文档详情查看、Markdown 文件上传
- **输入**：PRD.md 文档浏览功能 + 文档上传功能、Task-003 的文档数据、ARCHITECTURE.md 文档上传接口
- **输出**：
  - `apps/web/src/pages/DocumentPage.tsx` — 文档列表 + 上传按钮
  - `apps/web/src/components/Document/DocumentCard.tsx` — 分类色块卡片
  - `apps/web/src/components/Document/DocumentList.tsx` — 列表容器
  - `apps/web/src/components/Document/DocumentUploader.tsx` — 上传组件（拖拽/选择 .md 文件）
  - `apps/api/src/document/document.controller.ts` — `GET /api/documents`, `GET /api/documents/:id`, `POST /api/documents/upload`
  - `apps/api/src/document/document-upload.service.ts` — 保存文件、触发索引重建
- **验收标准**：
  - [ ] 页面展示 5 个内置文档卡片，带分类色块
  - [ ] 点击卡片查看完整 Markdown 内容
  - [ ] 支持按分类筛选
  - [ ] 点击"上传文档"，选择 .md 文件，上传成功并提示"已建立索引"
  - [ ] 上传新文档后，文档列表自动刷新，新文档出现在列表中
  - [ ] 上传非 .md 文件时，前端友好提示错误
  - [ ] 上传后，立即可以针对新文档提问，回答基于新文档内容
- **预计耗时**：4-5 小时

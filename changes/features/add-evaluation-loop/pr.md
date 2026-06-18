## 变更描述

为 RAG 系统增加自动评估闭环（Evaluation Loop）。对 50 条 HR FAQ 测试问题自动运行 RAG pipeline，用 Judge LLM（复用现有 qwen2.5）在准确性/完整性/相关性三个维度打分，统计来源引用频次和拒绝率。前端新增 `/evaluation` Dashboard 页面展示评估结果（指标卡片 + 纯 SVG 雷达图 + 来源频次图 + 问题列表）。

形成"检索 → 生成 → 评估 → 反馈"闭环，为 RAG 参数调优提供量化依据。

## 关联 Task

- **T-01**: Prisma 新增 EvalRun + EvalResult 模型
- **T-02**: 后端 EvalJudgeService（Judge LLM 评分）
- **T-03**: 后端 EvalService（主循环）+ EvalController + EvalModule
- **T-04**: 编写 50 条 HR FAQ 测试问题 JSON
- **T-05**: CLI 入口 `pnpm eval` 脚本
- **T-06**: 前端 Dashboard 页面 + 纯 SVG 雷达图
- **T-07**: App.tsx 路由 + Navbar 评估入口（HR only）
- **T-08**: E2E 测试：3 个 dashboard 用例

## 验收标准

### 后端
- [ ] Prisma EvalRun + EvalResult 模型，`db push` 成功
- [ ] `pnpm eval` CLI 命令可用，对 50 条问题运行评估
- [ ] Judge LLM 正确返回 JSON 格式评分
- [ ] 评估结果存入数据库，支持多次运行
- [ ] `/api/eval/runs` 返回完整评估数据（含 results 嵌套）
- [ ] `POST /api/eval/run` 触发评估并返回结果
- [ ] `cd apps/api && npx tsc --noEmit` 通过

### 前端
- [ ] `/evaluation` 路由可访问
- [ ] Dashboard 页面渲染：指标卡片 + 雷达图 + 来源频次 + 问题列表
- [ ] 雷达图使用纯 SVG，无第三方图表库依赖
- [ ] Navbar "评估"入口仅 HR 角色可见
- [ ] 空状态提示"暂无评估数据"
- [ ] "运行评估"按钮触发 POST 请求

### E2E 测试（新增 3 个）
- [ ] TC-EVAL-01: Dashboard 页面渲染
- [ ] TC-EVAL-02: 运行评估按钮可见
- [ ] TC-EVAL-03: 空状态提示可见

### 回归验证
- [ ] `pnpm test` — 全部单元测试通过
- [ ] `pnpm test:e2e` — 47 个测试通过（44 原有 + 3 新增）
- [ ] `pnpm lint && pnpm format:check && pnpm build` 通过

## Spec 变更

- 新增：`changes/features/add-evaluation-loop/spec.md`、`instruction.md`
- 修改：`apps/api/prisma/schema.prisma`（新增 EvalRun + EvalResult）
- 新增：`apps/api/src/eval/`（eval-judge.service.ts + eval.service.ts + eval.controller.ts + eval.module.ts + eval.interface.ts + test-questions.json + run-eval.ts）
- 修改：`apps/api/src/app.module.ts`（导入 EvalModule）
- 修改：`apps/api/package.json`（eval 脚本）
- 修改：根 `package.json`（eval 脚本）
- 新增：`apps/web/src/pages/EvaluationDashboard.tsx` + `.module.css`
- 修改：`apps/web/src/App.tsx`（/evaluation 路由）
- 修改：`apps/web/src/components/Layout/Navbar.tsx`（评估入口）
- 新增：`apps/web/e2e/specs/evaluation.spec.ts`

## 测试方式

1. `pnpm install`
2. `cd apps/api && npx prisma db push`
3. `pnpm eval` — 运行评估脚本
4. `pnpm dev` — 启动前后端，访问 `/evaluation`
5. `pnpm test:e2e` — 运行全部 E2E 测试

## 审查重点

- Judge LLM 的 JSON 解析容错性（`jsonMatch` 正则是否足够健壮，LLM 是否可能返回带换行/Markdown 代码块的 JSON）
- EvalService 的 orchestrate 循环是否正确处理 abort/chunk 累积（不调用 `break` 前确保最后一次 done chunk 被处理）
- 雷达图 SVG 的坐标计算是否正确（角度 0°/120°/240° + `Math.cos/sin` 的象限问题）
- `test-questions.json` 是否写满 50 条且覆盖 8 个类别
- 评估中途 Ollama 不可用时的错误处理（不应导致整个 run 失败，标记该题 rejected 继续）
- Navbar 评估入口的 `user?.role === 'hr'` 权限检查能否在无 user 对象时不 crash

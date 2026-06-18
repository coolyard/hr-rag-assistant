# Feature Spec：Evaluation Loop（RAG 评估闭环）

> 本 Feature 为 RAG 系统增加自动评估能力——对一批测试问题（50 条 HR FAQ）自动跑 RAG pipeline，用 Judge LLM 打分，统计来源引用频次和拒绝率，并在前端展示评估 Dashboard。形成"检索 → 生成 → 评估 → 反馈"闭环。
>
> 对应模块：无（新增 Eval 模块 + Dashboard 页面）
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前 RAG 系统有多个可调参数（`SIMILARITY_THRESHOLD`、`VECTOR_WEIGHT`、`KEYWORD_WEIGHT`、`VECTOR_TOP_K` 等），但这些参数的取值完全基于主观经验，没有量化依据。面试时如果被问到"你怎么确定阈值 0.5 是合理的"，没有数据支撑只能凭感觉回答。

主流 AI 产品（ChatGPT、Claude）都有内部评估体系。实现一个轻量级 Evaluation Loop 能展示你对 **AI 质量保障体系** 的理解——这不是在"写功能"，而是在"构建 AI 质量闭环"。

### 1.2 目标

1. **评估脚本**：CLI 命令 `pnpm eval` 对 50 条测试问题自动跑 RAG pipeline，收集回答
2. **Judge LLM**：复用现有 qwen2.5:7b-instruct 作为评估模型，对每个回答在准确性/完整性/相关性三个维度打分
3. **数据持久化**：评估结果存入 Prisma（EvalRun + EvalResult），支持多次评估历史对比
4. **前端 Dashboard**：新页面 `/evaluation`，展示平均分、指标卡片、雷达图（按问题类别）、来源引用频次、拒绝率
5. **检索质量分析**：统计哪些文档被频繁引用，哪些查询被拒绝，为参数调优提供依据

### 1.3 明确不做

- 不自动修改 RAG 参数（v1 只展示数据，人工决策调参）
- 不做增量评估（v1 每次跑全部 50 题）
- 不引入新的 LLM 模型（复用现有 qwen2.5:7b-instruct 做 Judge）
- 不做评估过程中的实时进度展示（v1 仅 CLI + 结果页面）
- 不做评估结果导出

---

## 2. 技术方案

### 2.1 架构设计

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  test-      │     │  EvalService     │     │  Prisma DB  │
│  questions  │────▶│  (主循环)         │────▶│  EvalRun    │
│  .json      │     │                  │     │  EvalResult │
└─────────────┘     │  ① for each Q:   │     └─────────────┘
                    │     rag.orchestrate()         │
                    │     收集 answer + sources     │
                    │                              │
                    │  ② 调用 Judge LLM             │
                    │     score(answer)             │
                    │                              │
                    │  ③ 存入 Prisma                │
                    └──────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Frontend         │
                    │  /evaluation      │
                    │                  │
                    │  GET /api/eval/   │
                    │  runs → Dashboard │
                    └──────────────────┘
```

### 2.2 Judge LLM 设计

**不引入新模型**。复用 `llmService.generate()`，使用独立 Judge prompt。调用时不走 streaming——收集完整回答后一次性评分。

**Judge Prompt 模板**：

```
你是一个 HR 知识评估专家。请对以下 AI 回答进行质量评分。

## 用户问题
{question}

## AI 回答
{answer}

## 评分标准
- accuracy（准确性 0-1）：回答的事实是否准确无误
- completeness（完整性 0-1）：是否覆盖了问题的所有关键方面
- relevance（相关性 0-1）：回答是否直接针对问题，有无跑题

## 输出格式
请严格输出 JSON，不要包含其他文字：
{"accuracy": 0.85, "completeness": 0.72, "relevance": 0.91}
```

### 2.3 数据模型（Prisma）

```prisma
model EvalRun {
  id              String        @id
  createdAt       DateTime      @default(now())
  model           String        // 使用的 LLM 模型名
  totalQuestions  Int           // 总问题数
  averageAccuracy Float         // 平均准确性
  averageCompleteness Float     // 平均完整性
  averageRelevance Float        // 平均相关性
  rejectionRate   Float         // 拒绝率（被 RAG 拒绝的比例）
  totalSources    Int           // 总引用次数
  results         EvalResult[]
}

model EvalResult {
  id              String   @id
  runId           String
  run             EvalRun  @relation(fields: [runId], references: [id], onDelete: Cascade)
  question        String
  category        String   // 问题类别（年假/报销/考勤/福利/晋升）
  answer          String
  accuracy        Float?
  completeness    Float?
  relevance       Float?
  sources         String?  // JSON: [{documentTitle, category, similarity}]
  rejected        Boolean  @default(false)
  timestamp       DateTime @default(now())
}
```

### 2.4 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/eval/runs` | 获取所有评估运行记录（含 results） |
| `POST` | `/api/eval/run` | 触发一次评估（返回 EvalRun） |

### 2.5 前端 Dashboard 组件结构

```
EvaluationDashboard
├── 页面头部：标题 + "运行评估"按钮 + 最近一次评估时间
├── 指标卡片行（4 个 MetricCard）
│   ├── 平均分（3 维度均值）
│   ├── 准确性
│   ├── 完整性
│   └── 拒绝率
├── 图表区（左右并排）
│   ├── 雷达图（按问题类别，SVG 实现）
│   │   轴：准确性/完整性/相关性
│   │   每个类别一条路径
│   └── 来源引用频次条形图（Top 5 文档）
└── 问题详情列表（可展开）
    └── 每题：问题文本 + 评分 + 来源数 + 是否被拒
```

### 2.6 雷达图 SVG 实现

不引入 Recharts，用纯 SVG。方案：
- 3 轴（准确性 top、完整性 bottom-right、相关性 bottom-left）
- 每个问题类别一条多边形路径
- 使用 `<svg>` + `<polygon>` + CSS 变量颜色
- 不需要任何 npm 依赖

### 2.7 EvalService 主循环伪代码

```typescript
async runEval(): Promise<EvalRun> {
  const questions = loadTestQuestions(); // 50 条
  const run = await prisma.evalRun.create({...});

  for (const q of questions) {
    // ① 调用 RAG
    let answer = '';
    let sources: SourceCitation[] = [];
    let rejected = false;

    try {
      for await (const chunk of ragService.orchestrate(q.question)) {
        if (chunk.done) {
          if (chunk.error || chunk.confidenceLevel === 'low') {
            rejected = true;
            answer = chunk.error || 'RAG 拒绝回答';
          }
          sources = chunk.sources ?? [];
          break;
        }
        answer += chunk.token; // 非流式累加
      }
    } catch {
      rejected = true;
      answer = '系统错误';
    }

    // ② Judge 评分（只评非拒绝的回答）
    let scores = null;
    if (!rejected && answer.length > 0) {
      scores = await evalJudge.score(q.question, answer);
    }

    // ③ 存入
    await prisma.evalResult.create({
      data: {
        id: generateId(),
        runId: run.id,
        question: q.question,
        category: q.category,
        answer,
        accuracy: scores?.accuracy,
        completeness: scores?.completeness,
        relevance: scores?.relevance,
        sources: JSON.stringify(sources.map(s => ({
          documentTitle: s.documentTitle,
          category: s.category,
          similarity: s.similarity,
        }))),
        rejected,
      },
    });
  }

  // ④ 更新 run 汇总
  const results = await prisma.evalResult.findMany({ where: { runId: run.id } });
  const scored = results.filter(r => !r.rejected);
  // ... 计算平均值

  return updatedRun;
}
```

---

## 3. 实现任务分解

| Task ID | 描述 | 涉及文件 |
|---------|------|----------|
| T-01 | Prisma 新增 EvalRun + EvalResult 模型，运行 db push | `schema.prisma` |
| T-02 | 后端：新建 EvalJudgeService（Judge LLM 评分） | 新建 `eval/eval-judge.service.ts` |
| T-03 | 后端：新建 EvalService（主循环）+ EvalController | 新建 `eval/eval.service.ts` + `eval.controller.ts` + `eval.module.ts` + `eval.interface.ts` |
| T-04 | 数据：编写 50 条 HR FAQ 测试问题 JSON | 新建 `eval/test-questions.json` |
| T-05 | CLI 入口：`pnpm eval` 脚本 | 新建 `eval/run-eval.ts` + `apps/api/package.json` scripts |
| T-06 | 前端：新建 Dashboard 页面 + 雷达图（纯 SVG） | 新建 `EvaluationDashboard.tsx` + `.module.css` |
| T-07 | 前端：App.tsx 路由 + Navbar 入口 | 修改 `App.tsx`、`Navbar.tsx` |
| T-08 | E2E Mock + 测试：3 个 dashboard 测试用例 | 修改 mock handlers + 新建 `evaluation.spec.ts` |

---

## 4. 测试用例（E2E 新增）

### TC-EVAL-01：Dashboard 页面渲染
- **步骤**：HR 登录，访问 `/evaluation`
- **预期**：页面标题"评估概览"可见，指标卡片区域存在

### TC-EVAL-02：评估结果数据展示
- **前置**：已有至少一次评估记录
- **步骤**：访问 `/evaluation`
- **预期**：平均分、准确率、完整率卡片显示正确数值

### TC-EVAL-03：雷达图渲染
- **前置**：已有评估记录
- **步骤**：访问 `/evaluation`
- **预期**：雷达图 SVG 元素存在

---

## 5. 验收标准

- [ ] Prisma 新增 EvalRun + EvalResult 模型，`db push` 成功
- [ ] `pnpm eval` CLI 命令可用，对 50 条问题运行评估
- [ ] Judge LLM 正确返回 JSON 格式的三维度评分
- [ ] 评估结果存入数据库，支持多次运行历史对比
- [ ] `/api/eval/runs` 返回完整评估数据
- [ ] `/evaluation` 页面展示：指标卡片 + 雷达图 + 来源频次 + 问题列表
- [ ] 雷达图使用纯 SVG，不引入第三方图表库
- [ ] Navbar 增加"评估"入口（仅 HR 角色可见）
- [ ] 现有 44 个 E2E 测试无回归
- [ ] 新增 3 个 E2E 测试全部通过
- [ ] `pnpm lint && pnpm format:check && pnpm build && pnpm test` 通过

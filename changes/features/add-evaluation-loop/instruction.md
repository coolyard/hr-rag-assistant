# Agent 指令：Evaluation Loop（RAG 评估闭环）

> 【执行纪律】本指令包含 8 个 Task，分为 4 个阶段。严格按照阶段顺序逐一完成，每阶段完成后运行验证通过再进入下一阶段。

---

## 前置阅读

1. `changes/features/add-evaluation-loop/spec.md`
2. `apps/api/src/rag/rag.service.ts`（`orchestrate`、`shouldReject`、`buildSources`）
3. `apps/api/src/rag/rag.interface.ts`（`StreamChunk`、`SourceCitation`）
4. `apps/api/src/llm/llm.service.ts`（`generate` 方法）
5. `apps/api/src/llm/llm.config.ts`（LLM 配置）
6. `apps/api/prisma/schema.prisma`
7. `apps/web/src/App.tsx`（路由结构）
8. `apps/web/src/components/Layout/Navbar.tsx`
9. `apps/web/src/hooks/useAuth.ts`

---

## 阶段 1：Prisma 迁移 + 测试数据（T-01 + T-04）

### T-01：新增 EvalRun + EvalResult 模型

编辑 `apps/api/prisma/schema.prisma`，在 `model Message` 之后新增：

```prisma
model EvalRun {
  id                 String        @id
  createdAt          DateTime      @default(now())
  model              String
  totalQuestions     Int
  averageAccuracy    Float
  averageCompleteness Float
  averageRelevance   Float
  rejectionRate      Float
  totalSources       Int
  results            EvalResult[]
}

model EvalResult {
  id           String   @id
  runId        String
  run          EvalRun  @relation(fields: [runId], references: [id], onDelete: Cascade)
  question     String
  category     String
  answer       String
  accuracy     Float?
  completeness Float?
  relevance    Float?
  sources      String?
  rejected     Boolean  @default(false)
  timestamp    DateTime @default(now())
}
```

运行迁移：

```bash
cd apps/api && npx prisma db push
```

### T-04：编写 50 条 HR FAQ 测试问题

新建 `apps/api/src/eval/test-questions.json`，包含 50 条测试问题，按类别分组：

```json
[
  { "question": "我今年还有几天年假？怎么申请？", "category": "年假" },
  { "question": "年假可以累积到明年吗？", "category": "年假" },
  { "question": "病假会影响年假天数吗？", "category": "年假" },
  { "question": "如果离职时年假没用完怎么办？", "category": "年假" },
  { "question": "试用期期间可以请年假吗？", "category": "年假" },
  { "question": "年假被拒怎么办？可以重新申请吗？", "category": "年假" },
  { "question": "可以分多次申请年假吗？最少几天？", "category": "年假" },
  { "question": "报销流程怎么走？多久能到账？", "category": "报销" },
  { "question": "出差住宿标准是多少？超出部分自付吗？", "category": "报销" },
  { "question": "加班餐补怎么报销？需要发票吗？", "category": "报销" }
]
```

> 需要写满 50 条，覆盖年假（7）、报销（7）、考勤（7）、福利（7）、晋升（7）、薪资（5）、培训（5）、其他（5）。可以在网上搜"HR 常见问题 FAQ"获取参考。确保问题自然，覆盖信息查询（"我有几天年假"）和流程询问（"怎么申请"）两种类型。

### 阶段 1 验证

```bash
cd apps/api && npx tsc --noEmit && ls prisma/dev.db
```

---

## 阶段 2：后端评估引擎（T-02、T-03、T-05）

### T-02：新建 EvalJudgeService

新建 `apps/api/src/eval/eval-judge.service.ts`：

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '@/llm/llm.service';

const JUDGE_PROMPT = `你是一个 HR 知识评估专家。请对以下 AI 回答进行质量评分。

## 用户问题
{{question}}

## AI 回答
{{answer}}

## 评分标准
- accuracy（准确性 0-1）：回答的事实是否准确，有无虚构或错误
- completeness（完整性 0-1）：是否覆盖了问题的所有关键方面
- relevance（相关性 0-1）：回答是否直接针对问题，有无跑题

## 输出格式
请严格输出 JSON，不要包含其他文字：
{"accuracy": 0.85, "completeness": 0.72, "relevance": 0.91}`;

export interface JudgeScores {
  accuracy: number;
  completeness: number;
  relevance: number;
}

@Injectable()
export class EvalJudgeService {
  private readonly logger = new Logger(EvalJudgeService.name);

  constructor(private readonly llmService: LLMService) {}

  async score(question: string, answer: string): Promise<JudgeScores> {
    const prompt = JUDGE_PROMPT.replace('{{question}}', question).replace('{{answer}}', answer);

    try {
      let fullResponse = '';
      for await (const token of this.llmService.generate(prompt)) {
        fullResponse += token;
      }

      // 提取 JSON
      const jsonMatch = /{[^}]+}/.exec(fullResponse);
      if (!jsonMatch) {
        this.logger.warn(`Judge did not return valid JSON: ${fullResponse.slice(0, 100)}`);
        return { accuracy: 0, completeness: 0, relevance: 0 };
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        accuracy: this.clamp(Number(parsed.accuracy ?? 0)),
        completeness: this.clamp(Number(parsed.completeness ?? 0)),
        relevance: this.clamp(Number(parsed.relevance ?? 0)),
      };
    } catch (error) {
      this.logger.error(`Judge scoring failed: ${String(error)}`);
      return { accuracy: 0, completeness: 0, relevance: 0 };
    }
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, Number.isNaN(value) ? 0 : value));
  }
}
```

> 注意：LLMService.generate() 调用时不传 stream 参数导致 `this.config.stream` 为 true 走流式路径——fine，`for await` 可以正常累加。不需要改动 LLMService。

### T-03：新建 EvalService + EvalController + EvalModule

#### 3.1 新建 `apps/api/src/eval/eval.interface.ts`

```typescript
export interface TestQuestion {
  question: string;
  category: string;
}
```

#### 3.2 新建 `apps/api/src/eval/eval.service.ts`

核心逻辑按 spec 2.7 伪代码实现。关键点：
- 注入 `RAGService`、`EvalJudgeService`、`PrismaService`
- `runEval()` 读取 `test-questions.json` → 循环调用 `ragService.orchestrate()` → 收集 answer + sources → Judge 评分 → 存入 Prisma
- 收集 orchestrate 结果时，用 `for await (const chunk of this.ragService.orchestrate(q.question))` 累加 `chunk.token`
- 在 done chunk 中获取 `sources`、`rejected` 状态
- 计算汇总数据后存入 EvalRun

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '@/prisma/prisma.service';
import { RAGService } from '@/rag/rag.service';
import { EvalJudgeService } from './eval-judge.service';
import type { TestQuestion } from './eval.interface';

function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${String(ts)}-${rand}`;
}

@Injectable()
export class EvalService {
  private readonly logger = new Logger(EvalService.name);

  constructor(
    private readonly ragService: RAGService,
    private readonly judgeService: EvalJudgeService,
    private readonly prisma: PrismaService,
  ) {}

  loadQuestions(): TestQuestion[] {
    const path = join(__dirname, 'test-questions.json');
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as TestQuestion[];
  }

  async runEval(judgeModel?: string) {
    const questions = this.loadQuestions();
    const model = judgeModel ?? 'qwen2.5:7b-instruct';

    const run = await this.prisma.evalRun.create({
      data: {
        id: generateId('eval'),
        model,
        totalQuestions: questions.length,
        averageAccuracy: 0,
        averageCompleteness: 0,
        averageRelevance: 0,
        rejectionRate: 0,
        totalSources: 0,
      },
    });

    let totalSources = 0;

    for (const q of questions) {
      let answer = '';
      const sources: Array<{ documentTitle: string; category: string; similarity: number }> = [];
      let rejected = false;

      try {
        for await (const chunk of this.ragService.orchestrate(q.question)) {
          if (chunk.token) {
            answer += chunk.token;
          }
          if (chunk.done) {
            if (chunk.confidenceLevel === 'low' || chunk.error) {
              rejected = true;
              answer = chunk.error || 'RAG 拒绝回答（文档相关度不足）';
            }
            if (chunk.sources) {
              for (const s of chunk.sources) {
                sources.push({
                  documentTitle: s.documentTitle,
                  category: s.category,
                  similarity: s.similarity,
                });
              }
            }
            break;
          }
        }
      } catch (error) {
        rejected = true;
        answer = `系统错误: ${String(error)}`;
      }

      let accuracy: number | null = null;
      let completeness: number | null = null;
      let relevance: number | null = null;

      if (!rejected && answer.length > 0) {
        try {
          const scores = await this.judgeService.score(q.question, answer);
          accuracy = scores.accuracy;
          completeness = scores.completeness;
          relevance = scores.relevance;
        } catch {
          // judge failed, leave scores as null
        }
      }

      await this.prisma.evalResult.create({
        data: {
          id: generateId('er'),
          runId: run.id,
          question: q.question,
          category: q.category,
          answer,
          accuracy,
          completeness,
          relevance,
          sources: sources.length > 0 ? JSON.stringify(sources) : null,
          rejected,
        },
      });

      totalSources += sources.length;
    }

    // 计算汇总
    const results = await this.prisma.evalResult.findMany({ where: { runId: run.id } });
    const scored = results.filter((r) => !r.rejected && r.accuracy != null);
    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    return this.prisma.evalRun.update({
      where: { id: run.id },
      data: {
        averageAccuracy: avg(scored.map((r) => r.accuracy!)),
        averageCompleteness: avg(scored.map((r) => r.completeness!)),
        averageRelevance: avg(scored.map((r) => r.relevance!)),
        rejectionRate: results.length > 0 ? results.filter((r) => r.rejected).length / results.length : 0,
        totalSources,
      },
      include: { results: true },
    });
  }

  async getRuns() {
    return this.prisma.evalRun.findMany({
      orderBy: { createdAt: 'desc' },
      include: { results: true },
    });
  }
}
```

#### 3.3 新建 `apps/api/src/eval/eval.controller.ts`

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { EvalService } from './eval.service';

@Controller('api/eval')
export class EvalController {
  constructor(private readonly evalService: EvalService) {}

  @Get('runs')
  async getRuns() {
    return this.evalService.getRuns();
  }

  @Post('run')
  async runEval() {
    return this.evalService.runEval();
  }
}
```

#### 3.4 新建 `apps/api/src/eval/eval.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { EvalController } from './eval.controller';
import { EvalService } from './eval.service';
import { EvalJudgeService } from './eval-judge.service';

@Module({
  controllers: [EvalController],
  providers: [EvalService, EvalJudgeService],
})
export class EvalModule {}
```

#### 3.5 在 `apps/api/src/app.module.ts` 中导入 `EvalModule`

```typescript
import { EvalModule } from './eval/eval.module';

// 在 imports 数组中添加 EvalModule
```

### T-05：CLI 入口脚本

新建 `apps/api/src/eval/run-eval.ts`：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EvalService } from './eval.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const evalService = app.get(EvalService);

  console.log('Starting evaluation...');
  const run = await evalService.runEval();
  console.log(`Evaluation complete: ${String(run.id)}`);
  console.log(`  Questions: ${String(run.totalQuestions)}`);
  console.log(`  Avg Accuracy: ${String(run.averageAccuracy.toFixed(2))}`);
  console.log(`  Avg Completeness: ${String(run.averageCompleteness.toFixed(2))}`);
  console.log(`  Avg Relevance: ${String(run.averageRelevance.toFixed(2))}`);
  console.log(`  Rejection Rate: ${String((run.rejectionRate * 100).toFixed(1))}%`);

  await app.close();
}

void bootstrap();
```

编辑 `apps/api/package.json`，在 `scripts` 中添加：

```json
"eval": "npx ts-node -r tsconfig-paths/register src/eval/run-eval.ts"
```

编辑根目录 `package.json`，在 `scripts` 中添加：

```json
"eval": "pnpm --filter api eval"
```

### 阶段 2 验证

```bash
cd apps/api && npx tsc --noEmit
```

---

## 阶段 3：前端 Dashboard（T-06 ~ T-07）

### T-06：新建 EvaluationDashboard 页面

新建 `apps/web/src/pages/EvaluationDashboard.tsx`，包含以下子组件：

#### 6.1 页面骨架

```tsx
import { type FC, useEffect, useState } from 'react';
import { Navbar } from '@/components/Layout/Navbar';
import styles from './EvaluationDashboard.module.css';

interface EvalRun {
  id: string;
  createdAt: string;
  model: string;
  totalQuestions: number;
  averageAccuracy: number;
  averageCompleteness: number;
  averageRelevance: number;
  rejectionRate: number;
  totalSources: number;
  results: EvalResult[];
}

interface EvalResult {
  id: string;
  question: string;
  category: string;
  answer: string;
  accuracy: number | null;
  completeness: number | null;
  relevance: number | null;
  sources: string | null;
  rejected: boolean;
}

export const EvaluationDashboard: FC = () => {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchRuns = async () => {
    const token = localStorage.getItem('hr_rag_token');
    const res = await fetch('/api/eval/runs', {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    const data = (await res.json()) as EvalRun[];
    setRuns(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchRuns();
  }, []);

  const handleRunEval = async () => {
    setRunning(true);
    const token = localStorage.getItem('hr_rag_token');
    await fetch('/api/eval/run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    await fetchRuns();
    setRunning(false);
  };

  const latest = runs[0];

  if (loading) return <div className={styles.loading}>加载中...</div>;

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>评估概览</h1>
          <button
            className={styles.runButton}
            onClick={() => { void handleRunEval(); }}
            disabled={running}
            type="button"
          >
            {running ? '运行中...' : '运行评估'}
          </button>
        </div>

        {!latest ? (
          <p className={styles.empty}>暂无评估数据，点击"运行评估"开始</p>
        ) : (
          <>
            {/* 指标卡片行 */}
            <MetricCards run={latest} />

            {/* 图表区 */}
            <div className={styles.charts}>
              <RadarChart results={latest.results} />
              <SourceChart results={latest.results} />
            </div>

            {/* 问题列表 */}
            <ResultList results={latest.results} />
          </>
        )}
      </div>
    </div>
  );
};
```

#### 6.2 MetricCards 子组件

4 个卡片水平排列：平均分（3 维度均值）、准确性、完整性、拒绝率。每个卡片包含标题 + 大号数字 + 百分比。

#### 6.3 RadarChart 子组件（纯 SVG）

```tsx
const RadarChart: FC<{ results: EvalResult[] }> = ({ results }) => {
  // 按 category 聚合评分
  const byCategory = new Map<string, { accuracy: number[]; completeness: number[]; relevance: number[] }>();
  for (const r of results) {
    if (r.rejected || r.accuracy == null) continue;
    const c = byCategory.get(r.category) ?? { accuracy: [], completeness: [], relevance: [] };
    c.accuracy.push(r.accuracy);
    c.completeness.push(r.completeness!);
    c.relevance.push(r.relevance!);
    byCategory.set(r.category, c);
  }

  const categories = Array.from(byCategory.keys());
  if (categories.length === 0) return null;

  const cx = 150, cy = 150, maxR = 120;
  const axes = 3; // accuracy, completeness, relevance
  const angles = [0, 120, 240].map((a) => (a * Math.PI) / 180);

  // 背景网格
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className={styles.chartCard}>
      <p className={styles.chartTitle}>按类别评分</p>
      <svg viewBox="0 0 300 300" width="100%" height="300">
        {/* 网格 */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={angles
              .map((a) => `${cx + maxR * level * Math.cos(a)},${cy + maxR * level * Math.sin(a)}`)
              .join(' ')}
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="1"
          />
        ))}
        {/* 轴线 */}
        {angles.map((a, i) => (
          <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="var(--border-color)" />
        ))}
        {/* 标签 */}
        {['准确性', '完整性', '相关性'].map((label, i) => (
          <text key={label} x={cx + (maxR + 20) * Math.cos(angles[i])} y={cy + (maxR + 20) * Math.sin(angles[i])} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">{label}</text>
        ))}
        {/* 数据多边形 */}
        {categories.map((cat, ci) => {
          const data = byCategory.get(cat)!;
          const avgAcc = data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length;
          const avgCom = data.completeness.reduce((a, b) => a + b, 0) / data.completeness.length;
          const avgRel = data.relevance.reduce((a, b) => a + b, 0) / data.relevance.length;
          const values = [avgAcc, avgCom, avgRel];
          const colors = ['var(--accent-color)', '#34d399', '#f59e0b', '#3b82f6'];
          return (
            <polygon
              key={cat}
              points={angles.map((a, i) => `${cx + maxR * values[i] * Math.cos(a)},${cy + maxR * values[i] * Math.sin(a)}`).join(' ')}
              fill={colors[ci % colors.length]}
              opacity="0.25"
              stroke={colors[ci % colors.length]}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      {/* 图例 */}
      <div className={styles.legend}>
        {categories.map((cat, ci) => (
          <span key={cat} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: ['var(--accent-color)', '#34d399', '#f59e0b'][ci % 3] }} />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
};
```

#### 6.4 SourceChart 条形图

```tsx
const SourceChart: FC<{ results: EvalResult[] }> = ({ results }) => {
  // 统计所有结果中的来源引用频次
  const freq = new Map<string, number>();
  for (const r of results) {
    if (r.sources) {
      for (const s of JSON.parse(r.sources) as Array<{ documentTitle: string }>) {
        freq.set(s.documentTitle, (freq.get(s.documentTitle) ?? 0) + 1);
      }
    }
  }
  const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCount = sorted[0]?.[1] ?? 1;

  return (
    <div className={styles.chartCard}>
      <p className={styles.chartTitle}>来源引用频次</p>
      {sorted.map(([title, count]) => (
        <div key={title} className={styles.sourceBarRow}>
          <span className={styles.sourceBarLabel}>{title}</span>
          <div className={styles.sourceBarTrack}>
            <div className={styles.sourceBar} style={{ width: `${(count / maxCount) * 100}%` }} />
          </div>
          <span className={styles.sourceBarCount}>{count}</span>
        </div>
      ))}
      {sorted.length === 0 && <p className={styles.empty}>暂无数据</p>}
    </div>
  );
};
```

#### 6.5 ResultList 问题列表

```tsx
const ResultList: FC<{ results: EvalResult[] }> = ({ results }) => (
  <div className={styles.chartCard}>
    <p className={styles.chartTitle}>问题列表</p>
    {results.map((r) => (
      <div key={r.id} className={styles.resultRow}>
        <span className={styles.resultQuestion}>{r.question}</span>
        {r.rejected ? (
          <span className={styles.resultBadgeRejected}>已拒</span>
        ) : (
          <span className={styles.resultBadge}>{(r.accuracy ?? 0).toFixed(2)}</span>
        )}
      </div>
    ))}
  </div>
);
```

#### 6.6 CSS 模块

新建 `apps/web/src/pages/EvaluationDashboard.module.css`，包含：
- `.page` — 全高 Flex 布局
- `.content` — padding + max-width 居中
- `.header` — flex between + 按钮样式
- `.charts` — grid 两列
- `.chartCard` — 白色/灰色卡片圆角
- `.runButton` — accent 背景的按钮
- 条形图样式（`.sourceBarRow`、`.sourceBarTrack` 等，复用 RetrievalPanel 的样式模式）
- 结果列表行样式

### T-07：App.tsx 路由 + Navbar 入口

#### 7.1 编辑 `apps/web/src/App.tsx`

在 ProtectedRoute 内的 `<Routes>` 中添加：

```tsx
import { lazy } from 'react';
const EvaluationDashboard = lazy(() => import('@/pages/EvaluationDashboard'));

// 在 <Routes> 内添加：
<Route path="/evaluation" element={<EvaluationDashboard />} />
```

#### 7.2 编辑 `apps/web/src/components/Layout/Navbar.tsx`

在导航链接列表中添加（仅 HR 角色可见）：

```tsx
{user?.role === 'hr' && (
  <NavLink to="/evaluation">评估</NavLink>
)}
```

### 阶段 3 验证

```bash
cd apps/web && npx tsc --noEmit && pnpm build
```

---

## 阶段 4：E2E 测试（T-08）

### T-08：新增 evaluation E2E 测试

#### 8.1 更新 `apps/web/e2e/mocks/api-handlers.ts`

添加评估 API mock：

```typescript
await page.route('**/api/eval/runs', async (route: Route) => {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([]),
  });
});
```

#### 8.2 新建 `apps/web/e2e/specs/evaluation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('评估 Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'hr');
    await page.goto('/evaluation');
  });

  test('TC-EVAL-01: Dashboard 页面渲染', async ({ page }) => {
    await expect(page.getByText('评估概览')).toBeVisible({ timeout: 5000 });
  });

  test('TC-EVAL-02: 运行评估按钮可见', async ({ page }) => {
    await expect(page.getByText('运行评估')).toBeVisible();
  });

  test('TC-EVAL-03: 空状态提示可见', async ({ page }) => {
    await expect(page.getByText('暂无评估数据')).toBeVisible();
  });
});
```

### 阶段 4 验证

```bash
pnpm test:e2e
```

---

## 最终验证

```bash
pnpm lint && pnpm format:check && pnpm build && pnpm test && pnpm test:e2e
```

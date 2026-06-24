import { type FC, useEffect, useState, useCallback } from 'react';

import { Navbar } from '@/components/Layout/Navbar';

import styles from './EvaluationDashboard.module.css';

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

interface EvalRun {
  id: string;
  createdAt: string;
  model: string;
  totalQuestions: number;
  status: string;
  completedCount: number;
  averageAccuracy: number;
  averageCompleteness: number;
  averageRelevance: number;
  rejectionRate: number;
  totalSources: number;
  results: EvalResult[];
}

const MetricCards: FC<{ run: EvalRun }> = ({ run }) => (
  <div className={styles.metricsRow}>
    <div className={styles.metricCard}>
      <span className={styles.metricLabel}>平均分</span>
      <span className={styles.metricValue}>
        {((run.averageAccuracy + run.averageCompleteness + run.averageRelevance) / 3).toFixed(2)}
      </span>
    </div>
    <div className={styles.metricCard}>
      <span className={styles.metricLabel}>准确性</span>
      <span className={styles.metricValue}>{run.averageAccuracy.toFixed(2)}</span>
    </div>
    <div className={styles.metricCard}>
      <span className={styles.metricLabel}>完整性</span>
      <span className={styles.metricValue}>{run.averageCompleteness.toFixed(2)}</span>
    </div>
    <div className={styles.metricCard}>
      <span className={styles.metricLabel}>拒绝率</span>
      <span className={styles.metricValue}>{(run.rejectionRate * 100).toFixed(0)}%</span>
    </div>
  </div>
);

// ── 雷达图（纯 SVG） ──
const RadarChart: FC<{ results: EvalResult[] }> = ({ results }) => {
  const byCategory = new Map<
    string,
    { accuracy: number[]; completeness: number[]; relevance: number[] }
  >();
  for (const r of results) {
    if (r.rejected || r.accuracy == null) continue;
    const c = byCategory.get(r.category) ?? { accuracy: [], completeness: [], relevance: [] };
    c.accuracy.push(r.accuracy);
    c.completeness.push(r.completeness ?? 0);
    c.relevance.push(r.relevance ?? 0);
    byCategory.set(r.category, c);
  }
  const cats = Array.from(byCategory.keys());
  if (cats.length === 0) return null;

  const cx = 150;
  const cy = 150;
  const maxR = 120;
  const angles = [0, 120, 240].map((a) => (a * Math.PI) / 180);
  const labels = ['准确性', '完整性', '相关性'];
  const colors = ['#6366f1', '#34d399', '#f59e0b', '#3b82f6', '#a855f7'];

  return (
    <div className={styles.chartCard}>
      <p className={styles.chartTitle}>按类别评分（雷达图）</p>
      <svg viewBox="0 0 340 300" width="100%" height="300" className={styles.svg}>
        {[0.25, 0.5, 0.75, 1.0].map((lvl) => (
          <polygon
            key={lvl}
            points={angles
              .map(
                (a) =>
                  `${String(cx + maxR * lvl * Math.cos(a))},${String(cy + maxR * lvl * Math.sin(a))}`,
              )
              .join(' ')}
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="1"
          />
        ))}
        {angles.map((a, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + maxR * Math.cos(a)}
            y2={cy + maxR * Math.sin(a)}
            stroke="var(--border-color)"
          />
        ))}
        {labels.map((label, i) => (
          <text
            key={label}
            x={cx + (maxR + 18) * Math.cos(angles[i])}
            y={cy + (maxR + 18) * Math.sin(angles[i])}
            textAnchor="middle"
            fontSize="11"
            fill="var(--text-secondary)"
          >
            {label}
          </text>
        ))}
        {cats.map((cat, ci) => {
          const d = byCategory.get(cat);
          if (!d) return null;
          const vals = [
            d.accuracy.reduce((a, b) => a + b, 0) / d.accuracy.length,
            d.completeness.reduce((a, b) => a + b, 0) / d.completeness.length,
            d.relevance.reduce((a, b) => a + b, 0) / d.relevance.length,
          ];
          return (
            <polygon
              key={cat}
              points={angles
                .map(
                  (a, i) =>
                    `${String(cx + maxR * vals[i] * Math.cos(a))},${String(cy + maxR * vals[i] * Math.sin(a))}`,
                )
                .join(' ')}
              fill={colors[ci % colors.length]}
              opacity="0.2"
              stroke={colors[ci % colors.length]}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className={styles.legend}>
        {cats.map((cat, ci) => (
          <span key={cat} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: colors[ci % colors.length] }} />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── 来源引用频次 ──
const SourceChart: FC<{ results: EvalResult[] }> = ({ results }) => {
  const freq = new Map<string, number>();
  for (const r of results) {
    if (r.sources) {
      for (const s of JSON.parse(r.sources) as Array<{ documentTitle: string }>) {
        freq.set(s.documentTitle, (freq.get(s.documentTitle) ?? 0) + 1);
      }
    }
  }
  const sorted = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCount = sorted[0]?.[1] ?? 1;

  return (
    <div className={styles.chartCard}>
      <p className={styles.chartTitle}>来源引用频次 (Top 5)</p>
      {sorted.map(([title, count]) => (
        <div key={title} className={styles.sourceBarRow}>
          <span className={styles.sourceBarLabel}>{title}</span>
          <div className={styles.sourceBarTrack}>
            <div
              className={styles.sourceBar}
              style={{ width: `${String((count / maxCount) * 100)}%` }}
            />
          </div>
          <span className={styles.sourceBarCount}>{count}</span>
        </div>
      ))}
      {sorted.length === 0 && <p className={styles.empty}>暂无数据</p>}
    </div>
  );
};

// ── 问题列表 ──
const ResultList: FC<{ results: EvalResult[] }> = ({ results }) => (
  <div className={styles.chartCard}>
    <p className={styles.chartTitle}>问题列表</p>
    {results.map((r) => (
      <div key={r.id} className={styles.resultRow}>
        <span className={styles.resultCategory}>[{r.category}]</span>
        <span className={styles.resultQuestion}>{r.question}</span>
        <span className={r.rejected ? styles.resultBadgeRejected : styles.resultBadge}>
          {r.rejected ? '已拒' : (r.accuracy ?? 0).toFixed(2)}
        </span>
      </div>
    ))}
  </div>
);

export const EvaluationDashboard: FC = () => {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchRuns = useCallback(async () => {
    const token = localStorage.getItem('hr_rag_token');
    const res: Response = await fetch('/api/eval/runs', {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rawData = (await res.json()) as unknown;
    const data: EvalRun[] = Array.isArray(rawData) ? rawData as EvalRun[] : [];
    setRuns(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  const handleRunEval = useCallback(async () => {
    setRunning(true);
    const token = localStorage.getItem('hr_rag_token');
    await fetch('/api/eval/run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    const poll = async () => {
      await fetchRuns();
      const checkRes: Response = await fetch('/api/eval/runs', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const checkData: EvalRun[] = (await checkRes.json()) as EvalRun[];
      const runningRun = checkData.find((r) => r.status === 'running');
      if (runningRun) {
        setTimeout(() => {
          void poll();
        }, 2000);
      } else {
        await fetchRuns();
        setRunning(false);
      }
    };
    void poll();
  }, [fetchRuns]);

  const latest = runs.find((r) => r.status === 'running') ?? runs[0];

  if (loading) return <div className={styles.loading}>加载中...</div>;

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>评估概览</h1>
          <button
            className={styles.runButton}
            onClick={() => {
              void handleRunEval();
            }}
            disabled={running}
            type="button"
          >
            {running ? '运行中...' : '运行评估'}
          </button>
        </div>

        {runs.length === 0 ? (
          <p className={styles.empty}>暂无评估数据，点击"运行评估"开始</p>
        ) : (
          <>
            <MetricCards run={latest} />
            <div className={styles.charts}>
              <RadarChart results={latest.results} />
              <SourceChart results={latest.results} />
            </div>
            <ResultList results={latest.results} />
          </>
        )}
      </div>
    </div>
  );
};

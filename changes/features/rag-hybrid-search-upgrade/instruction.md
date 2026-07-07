# Agent 指令：RAG 混合检索算法升级（BM25 + 同义词 + 动态权重）

> 【执行纪律】本指令包含 8 个 Task，分为 4 个阶段。你必须严格按照阶段顺序逐一完成，每完成一个阶段后运行对应验证命令确保通过后再进入下一阶段。禁止跳过任何步骤。

---

## 前置阅读（必须先读）

1. 读取 `changes/features/rag-hybrid-search-upgrade/spec.md` 了解完整需求和用例
2. 读取 `apps/api/src/rag/rag.interface.ts` 了解现有接口（`StreamChunk`、`RAGSearchResult`、`MergedResult` 等）
3. 读取 `apps/api/src/rag/keyword-search.service.ts` 了解当前手工词频累加实现
4. 读取 `apps/api/src/rag/rag.service.ts` 了解 `orchestrate()` 和 `mergeResults()` 当前逻辑
5. 读取 `apps/api/src/rag/rag.service.spec.ts` 了解现有测试
6. 读取 `specs/modules/rag-spec.md` 了解当前 Spec
7. 读取 `apps/api/package.json` 了解当前依赖

---

## 阶段 1：基础设施搭建（T-01 ~ T-03）

### T-01：安装 minisearch 依赖

#### 1.1 安装

```bash
cd apps/api && pnpm add minisearch
```

> **为什么选 minisearch 而非 lunr**：minisearch 对中文支持更好（内置 Unicode 分词），API 更简洁，体积更小（~30KB），零外部依赖。

#### 1.2 验证

```bash
cd apps/api && node -e "const MiniSearch = require('minisearch'); console.log('MiniSearch loaded:', typeof MiniSearch.default);"
```

### T-02：新增同义词词典 `synonyms.ts`

#### 2.1 新建 `apps/api/src/rag/synonyms.ts`

```typescript
/**
 * HR 领域同义词词典
 *
 * 用于查询扩展：当用户查询包含"核心词"时，自动追加其同义词以提升召回率。
 * 每次最多扩展 3 个同义词，避免过度扩展引入噪声。
 * 单字不触发扩展（如"假"）。
 */
export const SYNONYM_MAP: Record<string, string[]> = {
  '年假': ['年休假', '带薪年假', '带薪休假'],
  '病假': ['病事假', '医疗假', '病休'],
  '医保': ['医疗保险', '医保卡', '基本医疗保险'],
  '社保': ['社会保险', '五险', '五险一金'],
  '公积金': ['住房公积金', '住房基金'],
  '加班': ['加班加点', '超时工作', '延时工作'],
  '调休': ['补休', '调休假'],
  '报销': ['报账', '费用报销', '差旅报销'],
  '入职': ['报到', '新员工入职'],
  '离职': ['辞职', '解除劳动合同'],
  '绩效': ['绩效考核', 'KPI', 'OKR'],
  '薪资': ['工资', '薪水', '薪酬', '待遇'],
  '晋升': ['升职', '晋级', '提拔'],
  '福利': ['员工福利', '企业福利', '公司福利'],
  '打卡': ['考勤打卡', '签到'],
  '补贴': ['补助', '津贴', '补助金'],
};

/** 每次查询扩展最多追加的同义词数量 */
export const MAX_SYNONYM_EXPANSION = 3;

/**
 * 查询扩展：在原始查询后追加匹配的同义词
 *
 * @param query 原始用户查询
 * @returns 扩展后的查询字符串
 *
 * @example
 *   expandQuery('医保报销流程')    // → '医保报销流程 医疗保险 医保卡 基本医疗保险'
 *   expandQuery('我没有年假')      // → '我没有年假'（单字"假"不触发扩展）
 *   expandQuery('今天天气')      // → '今天天气'（无匹配同义词）
 */
export function expandQuery(query: string): string {
  let expanded = query;
  const matched: string[] = [];

  for (const [term, synonyms] of Object.entries(SYNONYM_MAP)) {
    // 核心词 ≥2 字才触发扩展，避免"假"单独匹配"病假"等名词
    if (term.length >= 2 && query.includes(term)) {
      matched.push(term);
      for (const syn of synonyms) {
        if (!expanded.includes(syn)) {
          expanded += ' ' + syn;
          if (matched.length * MAX_SYNONYM_EXPANSION <= synonyms.length) break;
        }
      }
    }
  }

  return expanded;
}
```

### T-03：新增查询分类器 `query-classifier.ts`

#### 3.1 新建 `apps/api/src/rag/query-classifier.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

import { HR_KEYWORDS } from '@/rag/keyword-search.service';

export type QueryCategory = 'exact-keyword' | 'semantic' | 'mixed';

export interface QueryClassification {
  /** 分类类别 */
  category: QueryCategory;
  /** 分类置信度 [0, 1] */
  confidence: number;
  /** 向量检索权重 [0, 1] */
  vectorWeight: number;
  /** 关键词检索权重 [0, 1] */
  keywordWeight: number;
}

/** 权重预设表 */
const WEIGHT_PRESETS: Record<QueryCategory, { vectorWeight: number; keywordWeight: number; confidence: number }> = {
  'exact-keyword': { vectorWeight: 0.2, keywordWeight: 0.8, confidence: 0.9 },
  semantic: { vectorWeight: 0.7, keywordWeight: 0.3, confidence: 0.85 },
  mixed: { vectorWeight: 0.4, keywordWeight: 0.6, confidence: 0.8 },
};

@Injectable()
export class QueryClassifier {
  private readonly logger = new Logger(QueryClassifier.name);

  /**
   * 对用户查询进行分类，返回类别 + 建议权重
   *
   * 分类规则：
   * - exact-keyword: 包含 ≥2 个 HR_KEYWORDS 且无口语化标记
   * - semantic: 无关键词匹配，或有口语化标记且关键词密度 < 0.08
   * - mixed: 其余情况（默认）
   *
   * @param query 用户查询文本
   * @returns 分类结果（含权重建议）
   */
  classify(query: string): QueryClassification {
    const keywordMatches = HR_KEYWORDS.filter((kw) => kw.length >= 2 && query.includes(kw));
    const hasColloquialMarkers = /感觉|我想|想问问|怎么|怎么样|如何|是不是|能不能|可不可以/.test(query);
    const keywordDensity = keywordMatches.length / Math.max(query.length, 1);

    let category: QueryCategory;

    if (keywordDensity > 0.15 && keywordMatches.length >= 2 && !hasColloquialMarkers) {
      category = 'exact-keyword';
    } else if (keywordMatches.length === 0 || (hasColloquialMarkers && keywordDensity < 0.08)) {
      category = 'semantic';
    } else {
      category = 'mixed';
    }

    const preset = WEIGHT_PRESETS[category];
    this.logger.log(
      `Query classified as "${category}" (keywords: ${String(keywordMatches.length)}, density: ${keywordDensity.toFixed(3)}, colloquial: ${String(hasColloquialMarkers)}) → v:${String(preset.vectorWeight)} k:${String(preset.keywordWeight)}`,
    );

    return {
      category,
      confidence: preset.confidence,
      vectorWeight: preset.vectorWeight,
      keywordWeight: preset.keywordWeight,
    };
  }
}
```

### 阶段 1 验证

```bash
cd apps/api && npx tsc --noEmit
```

确保 TypeScript 编译无错误。

---

## 阶段 2：核心引擎重写（T-04）

### T-04：重写 KeywordSearchService 为 BM25 引擎

#### 4.1 重写 `apps/api/src/rag/keyword-search.service.ts`

**注意**：这是完全重写，保留 `HR_KEYWORDS` 导出（被 `query-classifier.ts` 和 `tool-registry.service.ts` 引用），其余全部替换。

```typescript
import { Injectable, Logger } from '@nestjs/common';
import MiniSearch, { type Options as MiniSearchOptions, type SearchResult as MiniSearchResult } from 'minisearch';

import type { RAGSearchResult } from '@/rag/rag.interface';
import { expandQuery } from '@/rag/synonyms';
import type { SearchResult } from '@/vector/vector.interface';

export const HR_KEYWORDS = [
  '年假', '年休假', '带薪休假', '请假', '休假',
  '报销', '发票', '差旅', '交通费', '住宿费', '通讯补贴',
  '补贴', '交通补贴', '餐补', '食补', '饭贴', '午餐补贴', '餐饮补贴',
  '晋升', '升职', '考核', '绩效', '评估', '调薪',
  '考勤', '打卡', '迟到', '早退', '旷工', '加班', '弹性工作',
  '福利', '社保', '公积金', '医疗保险', '体检', '节日',
  '工资', '薪资', '薪酬', '离职', '入职', '转正', '劳动合同',
];

/** 已索引文档的内部表示 */
interface IndexedDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  heading: string;
  documentTitle: string;
  categoryName: string;
  /** 指向原始 SearchResult 的引用 */
  ref: SearchResult;
}

const MINISEARCH_OPTIONS: MiniSearchOptions = {
  fields: ['title', 'content', 'category'],
  storeFields: ['id', 'heading', 'documentTitle', 'categoryName'],
  searchOptions: {
    boost: { title: 3, content: 1.5, category: 1 },
    prefix: true,
    fuzzy: 0.2,
  },
};

@Injectable()
export class KeywordSearchService {
  private readonly logger = new Logger(KeywordSearchService.name);
  private miniSearch: MiniSearch<IndexedDoc> | null = null;
  private indexedChunks: Map<string, SearchResult> = new Map();

  /**
   * 构建 BM25 索引（在文档加载完成后调用一次）
   *
   * @param chunks 所有文档片段
   */
  buildIndex(chunks: SearchResult[]): void {
    this.logger.log(`Building BM25 index with ${String(chunks.length)} documents...`);
    this.indexedChunks.clear();
    this.miniSearch = new MiniSearch<IndexedDoc>(MINISEARCH_OPTIONS);

    const docs: IndexedDoc[] = chunks.map((chunk, idx) => {
      const id = String(idx);
      this.indexedChunks.set(id, chunk);
      return {
        id,
        title: `${chunk.heading} ${chunk.documentTitle}`,
        content: chunk.content,
        category: chunk.categoryName,
        heading: chunk.heading,
        documentTitle: chunk.documentTitle,
        categoryName: chunk.categoryName,
        ref: chunk,
      };
    });

    this.miniSearch.addAll(docs);
    this.logger.log(`BM25 index built: ${String(this.miniSearch.documentCount)} documents indexed`);
  }

  /**
   * BM25 关键词检索（带同义词扩展）
   *
   * @param query 原始用户查询
   * @param topK 返回结果数
   * @returns BM25 排序后的结果（normalizedScore 已归一化到 [0, 1]）
   *
   * 索引未构建时返回空数组
   */
  search(query: string, topK: number): RAGSearchResult[] {
    if (!this.miniSearch || this.miniSearch.documentCount === 0) {
      this.logger.warn('BM25 index not built, returning empty results');
      return [];
    }

    //  同义词扩展
    const expandedQuery = expandQuery(query);
    if (expandedQuery !== query) {
      this.logger.log(`Query expanded with synonyms: "${query}" → "${expandedQuery}"`);
    }

    // 执行搜索
    const raw: MiniSearchResult[] = this.miniSearch.search(expandedQuery, { prefix: true, fuzzy: 0.2 });

    // 取 topK
    const top = raw.slice(0, topK);

    if (top.length === 0) {
      return [];
    }

    // 映射为 RAGSearchResult
    const results: RAGSearchResult[] = top.map((r) => {
      const chunk = this.indexedChunks.get(r.id)!;
      return {
        ...chunk,
        source: 'keyword' as const,
        score: r.score,
        normalizedScore: r.score, // 先填原始分，后续统一归一化
      };
    });

    // Min-Max 归一化到 [0, 1]
    return this.normalizeScores(results);
  }

  /**
   * Min-Max 分数归一化
   */
  private normalizeScores(results: RAGSearchResult[]): RAGSearchResult[] {
    if (results.length === 0) return results;
    const scores = results.map((r) => r.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    if (max === min) {
      return results.map((r) => ({ ...r, normalizedScore: 1.0 }));
    }
    return results.map((r) => ({
      ...r,
      normalizedScore: (r.score - min) / (max - min),
    }));
  }

  /**
   * 检查索引是否已构建
   */
  isReady(): boolean {
    return this.miniSearch !== null && this.miniSearch.documentCount > 0;
  }
}
```

> **关键变更**：
> - `search()` 签名从 `(query, chunks, topK)` 改为 `(query, topK)`
> - 不再需要传入 `chunks` 参数（索引已内含全部文档）
> - 内部自动进行同义词扩展
> - BM25 分数通过 Min-Max 归一化到 [0, 1]

### 阶段 2 验证

```bash
cd apps/api && npx tsc --noEmit
```

---

## 阶段 3：RAGService 集成（T-05）

### T-05：更新 RAGService 集成动态权重

编辑 `apps/api/src/rag/rag.service.ts`。

#### 5.1 导入新的依赖

在文件顶部新增导入：

```typescript
import { QueryClassifier } from '@/rag/query-classifier';
```

#### 5.2 注入 QueryClassifier

在 constructor 中新增：

```typescript
private readonly queryClassifier: QueryClassifier,
```

#### 5.3 修改 orchestrate() 方法

##### a) 调用 keywordSearch 的方式

找到 `this.keywordSearch.search(query, allChunks, KEYWORD_TOP_K)`，替换为：

```typescript
const keywordResults = this.keywordSearch.search(query, KEYWORD_TOP_K);
```

##### b) 在合并之前加入动态权重分类

在 `merged = this.mergeResults(...)` 调用之前，新增：

```typescript
// 动态权重分类
const classification = this.queryClassifier.classify(query);
```

##### c) 修改 mergeResults 调用

将 `this.mergeResults(vectorResults, keywordResults)` 调用替换为：

```typescript
merged = this.mergeResults(vectorResults, keywordResults, classification);
```

#### 5.4 修改 mergeResults() 方法签名和实现

##### a) 签名修改

```typescript
// 之前：
private mergeResults(vectorResults: RAGSearchResult[], keywordResults: RAGSearchResult[]): MergedResult[]

// 之后：
private mergeResults(
  vectorResults: RAGSearchResult[],
  keywordResults: RAGSearchResult[],
  classification: QueryClassification,
): MergedResult[]
```

##### b) 体重计算替换

将硬编码的 `VECTOR_WEIGHT` 和 `KEYWORD_WEIGHT` 替换为 `classification.vectorWeight` 和 `classification.keywordWeight`。

`mergedScore = ...` 那行改为使用动态权重。

#### 5.5 更新 module 导入

编辑 `apps/api/src/rag/rag.module.ts`（以及可能相关的 module），确保 `QueryClassifier` 被加入 `providers`。

### 阶段 3 验证

```bash
cd apps/api && npx tsc --noEmit
```

确保编译通过。

---

## 阶段 4：测试与 Spec 更新（T-06 ~ T-08）

### T-06：新增和更新单元测试

#### 6.1 新建 `apps/api/src/rag/keyword-search.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';

import { KeywordSearchService } from '@/rag/keyword-search.service';
import type { SearchResult } from '@/vector/vector.interface';

const mockChunks: SearchResult[] = [
  {
    id: '1',
    heading: '年假申请流程',
    documentTitle: '年假制度',
    categoryName: '休假管理',
    content: '员工每年享有 5 天带薪年假。申请年假需要提前 3 个工作日向直属主管提交申请。年假可以连续使用也可以分段使用。',
    score: 0,
  },
  {
    id: '2',
    heading: '病假管理规定',
    documentTitle: '请假制度',
    categoryName: '考勤管理',
    content: '病假需提供医院出具的诊断证明。病假期间工资按照基本工资的 80% 发放。单次病假不超过 3 天的，无需提供诊断证明。',
    score: 0,
  },
  {
    id: '3',
    heading: '医疗保险报销流程',
    documentTitle: '医疗保险说明',
    categoryName: '福利待遇',
    content: '员工参加基本医疗保险后，可凭医保卡在定点医院就医。门诊报销比例为 70%，住院报销比例为 85%。报销需提交医保卡、发票原件和费用清单。',
    score: 0,
  },
  {
    id: '4',
    heading: '加班与调休制度',
    documentTitle: '考勤管理制度',
    categoryName: '考勤管理',
    content: '工作日加班按照 1.5 倍工资计算，休息日加班按照 2 倍工资计算，法定节假日加班按照 3 倍工资计算。加班可以申请调休，调休需在加班后 30 天内使用。',
    score: 0,
  },
  {
    id: '5',
    heading: '公司食堂管理办法',
    documentTitle: '后勤管理制度',
    categoryName: '后勤服务',
    content: '公司食堂位于 B1 层，供应早餐（7:00-9:00）和午餐（11:30-13:00）。员工凭工卡刷卡就餐，餐费从工资中代扣。',
    score: 0,
  },
];

describe('KeywordSearchService with BM25', () => {
  let service: KeywordSearchService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeywordSearchService],
    }).compile();
    service = module.get<KeywordSearchService>(KeywordSearchService);
    service.buildIndex(mockChunks);
  });

  it('BM25 应正确计算相关性分数并返回排序结果', () => {
    const results = service.search('年假申请', 3);
    expect(results.length).toBeGreaterThan(0);
    // "年假制度" 应该在 Top-1（标题匹配权重最高）
    expect(results[0].documentTitle).toBe('年假制度');
    // 分数应已归一化到 [0,1]
    expect(results[0].normalizedScore).toBeGreaterThanOrEqual(0);
    expect(results[0].normalizedScore).toBeLessThanOrEqual(1);
  });

  it('标题匹配应有更高分数（boost=3）', () => {
    // "医疗保险" 出现在 chunk #3 的标题中
    const results = service.search('医疗保险报销', 3);
    const topDoc = results[0];
    expect(topDoc.heading).toContain('医疗保险');
  });

  it('同义词扩展应召回相关文档（"医保" → "医疗保险"）', () => {
    const results = service.search('医保报销', 3);
    // 应该召回"医疗保险报销流程"文档（同义词扩展了"医疗保险"）
    const hasMedical = results.some((r) => r.documentTitle.includes('医疗保险'));
    expect(hasMedical).toBe(true);
  });

  it('前缀匹配应召回相关文档（"年" → "年假"）', () => {
    const results = service.search('年', 3);
    // 至少应有一篇相关（年假相关）
    expect(results.length).toBeGreaterThan(0);
  });

  it('无匹配时应返回空数组', () => {
    const results = service.search('火星移民政策', 3);
    expect(results).toHaveLength(0);
  });

  it('索引未构建时应返回空数组', () => {
    const freshService = new KeywordSearchService();
    const results = freshService.search('年假', 3);
    expect(results).toHaveLength(0);
  });

  it('不同文档长度应公平排序（短文档不被长文档压制）', () => {
    // 短文档（chunk #1，92字）和长文档（chunk #4，108字）
    // BM25 有文档长度归一化，应公平比较
    const results = service.search('加班', 5);
    // "加班与调休制度"（chunk #4）应该在 "年假"（chunk #1）之前（更相关）
    const overtimeIdx = results.findIndex((r) => r.documentTitle === '考勤管理制度');
    const annualIdx = results.findIndex((r) => r.documentTitle === '年假制度');
    expect(overtimeIdx).toBeLessThan(annualIdx);
  });
});

describe('QueryClassifier', () => {
  // QueryClassifier 的测试可独立运行（不依赖 KeywordSearchService 索引）
  it('"年假怎么请" 应分类为 exact-keyword', async () => {
    const { QueryClassifier } = await import('@/rag/query-classifier');
    const classifier = new QueryClassifier();
    const result = classifier.classify('年假怎么请');
    expect(result.category).toBe('exact-keyword');
    expect(result.keywordWeight).toBe(0.8);
  });

  it('"我想休息一段时间" 应分类为 semantic', async () => {
    const { QueryClassifier } = await import('@/rag/query-classifier');
    const classifier = new QueryClassifier();
    const result = classifier.classify('我想休息一段时间');
    expect(result.category).toBe('semantic');
    expect(result.vectorWeight).toBe(0.7);
  });

  it('"请病假要扣钱吗" 应分类为 mixed', async () => {
    const { QueryClassifier } = await import('@/rag/query-classifier');
    const classifier = new QueryClassifier();
    const result = classifier.classify('请病假要扣钱吗');
    expect(result.category).toBe('mixed');
    expect(result.keywordWeight).toBe(0.6);
  });

  it('空字符串不应崩溃', async () => {
    const { QueryClassifier } = await import('@/rag/query-classifier');
    const classifier = new QueryClassifier();
    const result = classifier.classify('');
    expect(result.category).toBeDefined();
  });
});
```

#### 6.2 更新 `apps/api/src/rag/rag.service.spec.ts`

检查现有 `rag.service.spec.ts` 中的 `mergeResults` 测试调用，适配新的签名（增加 `classification` 参数）。不需要重写整个文件，只需：

```typescript
// 在 mergeResults 调用处增加 classification 参数
const classification = { category: 'mixed' as const, confidence: 0.8, vectorWeight: 0.4, keywordWeight: 0.6 };
service.mergeResults(vectorResults, keywordResults, classification);
```

#### 6.3 运行测试

```bash
pnpm test
```

确保新增测试全部通过，原有测试无回归。

### T-07：更新 rag-spec.md

编辑 `specs/modules/rag-spec.md`：

- 将 `RRF 合并与去重策略` 改为 `加权分数合并策略（支持查询自适应动态权重）`
- Section 2 新增 dynamic_weight 说明章节：

```markdown
| `dynamic_weight`        | 自适应 | 根据 QueryClassifier 分类结果动态选择权重预设（exact-keyword: 0.2+0.8, semantic: 0.7+0.3, mixed: 0.4+0.6） |
```

- 在检索参数表中，将 `vector_weight` 和 `keyword_weight` 的说明更新为「默认值（mixed 类别）；精确查询/语义查询时由 QueryClassifier 动态覆盖」

### T-08：完整回归验证

```bash
pnpm lint
pnpm format:check
pnpm build
pnpm test
pnpm test:e2e
```

全部通过后，提交代码。

---

---

## 阶段 5：本地文档同步更新（T-09）

### T-09：同步更新所有本地 md 文件中关于混合检索/权重相关描述

> **重要**：代码变更完成后，必须同步更新根目录所有 md 文件中对混合检索/关键词检索/权重的描述，确保文档与代码实现完全一致。

#### 9.1 需要更新的文件清单

| 文件 | 需更新的内容 |
|------|------------|
|  | 删除「RRF 简化版」误标；补充动态权重说明章节；将关键词检索描述更新为 BM25 |
|  | `KeywordSearch.search` 调用流程描述更新 |
|  | 核心特性第 14 行「向量检索(权重0.4) + 关键词检索(权重0.6)」→「BM25 关键词检索 + 查询自适应动态权重」；目录结构 rag/ 描述更新 |
|  | 检索流程图第 37 行关键词检索标注更新为 BM25 |
|  | 「向量+关键词混合检索」→「BM25 关键词检索 + 查询自适应动态权重」 |
|  | **最多改动**，包括：混合检索算法详解（标题/正文）、关键词检索实现描述、权重代码示例（0.4+0.6 → 动态权重）、面试考点 Q2「权重怎么确定」、流程图、性能指标表格、来源贡献说明、调权建议 |
|  | 关键词检索模块描述更新 |

#### 9.2 更新原则

1. **检索权重描述**：将「向量检索(权重0.4) + 关键词检索(权重0.6)」统一改为 **「BM25 关键词检索 + 查询自适应动态权重」**，并补充三种预设场景：
   - （精确关键词查询）：向量 0.2 + 关键词 0.8
   - （语义口语化查询）：向量 0.7 + 关键词 0.3
   - （混合查询，默认）：向量 0.4 + 关键词 0.6

2. **关键词检索实现**：将「手工词频累加」「正则匹配计分」等描述改为 **「MiniSearch BM25 索引引擎（支持前缀匹配、模糊匹配、字段权重 boost）」**

3. **合并策略**：将「RRF 简化版」改为 **「加权分数合并（支持查询自适应动态权重）」**

4. **同义词**：在关键词检索描述中补充同义词扩展能力（如医保→医疗保险）

5. **面试考点**： 中关于「0.4+0.6 怎么确定」的 Q&A 更新为解释动态权重的分类逻辑（基于关键词密度 + 口语化标记的特征规则分类器），以及三种场景的权重选择依据

#### 9.3 验证

README.md:- **完整 RAG 链路**：向量检索(权重0.4) + 关键词检索(权重0.6) 混合，真实 768 维 Embedding，余弦相似度计算
knowledge/HR-RAG-全栈技术深度解析.md:| **智能问答**     | 自然语言 → 检索 → LLM 生成 | 混合检索（向量 0.4 + 关键词 0.6）、四层幻觉防御         |
knowledge/HR-RAG-全栈技术深度解析.md:// 向量权重 0.4 + 关键词权重 0.6
knowledge/HR-RAG-全栈技术深度解析.md:> 🎯 **面试考点**："混合检索权重 0.4 + 0.6 是怎么确定的？"
knowledge/HR-RAG-全栈技术深度解析.md:    │   └── 向量结果 × 0.4 + 关键词结果 × 0.6
knowledge/HR-RAG-全栈技术深度解析.md:#### Q2：混合检索的权重 0.4 + 0.6 是怎么确定的？如果换到电商商品检索场景，权重应该怎么调？
knowledge/HR-RAG-全栈技术深度解析.md:2. **HR 场景选 0.4+0.6 的原因**：关键词检索更可靠，因为 HR 术语固定、用户问题通常包含明确关键词
specs/modules/rag-spec.md:### 3.3 合并与去重（RRF 简化版）
specs/modules/rag-spec.md:- [ ] 混合检索权重正确：向量 0.4 + 关键词 0.6

---

## 最终验证

全部阶段完成后，运行以下命令：

Scope: all 3 workspace projects
[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY] Aborted removal of modules directory due to no TTY

If you are running pnpm in CI, set the CI environment variable to "true", or set "confirmModulesPurge" to "false".
[ERROR] Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install

pnpm: Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install
    at getFinalError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:34109:14)
    at makeError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:36416:21)
    at getSyncResult (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38260:10)
    at spawnSubprocessSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38220:14)
    at execaCoreSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38150:23)
    at callBoundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40678:23)
    at boundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40655:49)
    at sync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40814:10)
    at runPnpmCli (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:245099:5)
    at runDepsStatusCheck (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:246833:7)
Scope: all 3 workspace projects
[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY] Aborted removal of modules directory due to no TTY

If you are running pnpm in CI, set the CI environment variable to "true", or set "confirmModulesPurge" to "false".
[ERROR] Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install

pnpm: Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install
    at getFinalError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:34109:14)
    at makeError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:36416:21)
    at getSyncResult (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38260:10)
    at spawnSubprocessSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38220:14)
    at execaCoreSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38150:23)
    at callBoundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40678:23)
    at boundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40655:49)
    at sync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40814:10)
    at runPnpmCli (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:245099:5)
    at runDepsStatusCheck (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:246833:7)
Scope: all 3 workspace projects
[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY] Aborted removal of modules directory due to no TTY

If you are running pnpm in CI, set the CI environment variable to "true", or set "confirmModulesPurge" to "false".
[ERROR] Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install

pnpm: Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install
    at getFinalError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:34109:14)
    at makeError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:36416:21)
    at getSyncResult (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38260:10)
    at spawnSubprocessSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38220:14)
    at execaCoreSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38150:23)
    at callBoundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40678:23)
    at boundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40655:49)
    at sync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40814:10)
    at runPnpmCli (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:245099:5)
    at runDepsStatusCheck (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:246833:7)
Scope: all 3 workspace projects
[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY] Aborted removal of modules directory due to no TTY

If you are running pnpm in CI, set the CI environment variable to "true", or set "confirmModulesPurge" to "false".
[ERROR] Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install

pnpm: Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install
    at getFinalError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:34109:14)
    at makeError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:36416:21)
    at getSyncResult (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38260:10)
    at spawnSubprocessSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38220:14)
    at execaCoreSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38150:23)
    at callBoundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40678:23)
    at boundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40655:49)
    at sync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40814:10)
    at runPnpmCli (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:245099:5)
    at runDepsStatusCheck (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:246833:7)
Scope: all 3 workspace projects
[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY] Aborted removal of modules directory due to no TTY

If you are running pnpm in CI, set the CI environment variable to "true", or set "confirmModulesPurge" to "false".
[ERROR] Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install

pnpm: Command failed with exit code 1: /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.mjs install
    at getFinalError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:34109:14)
    at makeError (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:36416:21)
    at getSyncResult (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38260:10)
    at spawnSubprocessSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38220:14)
    at execaCoreSync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:38150:23)
    at callBoundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40678:23)
    at boundExeca (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40655:49)
    at sync (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:40814:10)
    at runPnpmCli (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:245099:5)
    at runDepsStatusCheck (file:///Users/cool/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/pnpm@11.7.0/node_modules/pnpm/dist/pnpm.mjs:246833:7)

全部通过后，按照 `.github/pull_request_template.md` 模版和 `changes/features/rag-hybrid-search-upgrade/pr.md` 的内容创建 PR。

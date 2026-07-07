# Feature Spec：RAG 混合检索算法升级（BM25 + 同义词 + 动态权重）

> 本 Feature 将 RAG 关键词检索从手工词频累加升级为 BM25 索引 + 同义词扩展，并引入查询自适应的动态权重调节。提升排序准确性与召回覆盖，解决同义词/口语化查询失效问题。
>
> 对应变更域：rag-engine-v2
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前 `KeywordSearchService`（`apps/api/src/rag/keyword-search.service.ts`）采用手工词频累加方案，存在以下问题：

1. **无 TF-IDF 权重**：高频泛词（如"公司"）和低频精准词（如"公积金"）权重相同
2. **无文档长度归一化**：长文档天然词频高，短文档处于劣势
3. **同义词缺失**：用户问"医保"匹配不到"医疗保险"，问"病假"不在关键词表中则完全失效
4. **权重全局固定**：所有查询都套用 `向量 0.4 + 关键词 0.6`，无法适应"精确术语查询"和"语义口语化查询"的不同场景
5. **Spec 与实现不一致**：`specs/modules/rag-spec.md` 将合并策略标注为「RRF 简化版」，实际实现是「加权分数融合」

### 1.2 目标

在不改变现有系统架构和部署方式的前提下：

- 将关键词检索升级为 **BM25 + 同义词扩展**
- 引入 **查询自适应的动态权重调节**
- 提升排序准确性（预期 Top-1 命中率提升 20%+）
- 解决同义词/口语化表达导致的召回缺失
- 保持与现有接口兼容，所有现有测试继续通过

### 1.3 明确不做

- 不引入 Elasticsearch、Meilisearch 等重型搜索引擎
- 不更换 Embedding 模型
- 不引入 Cross-Encoder Reranker
- 不修改前端 UI
- 不修改数据库 schema
- 不增加新的 API 端点

---

## 2. 技术方案

### 2.1 BM25 检索引擎

#### 2.1.1 选型决策

经过评估，选择 **`minisearch`**（~30KB，零外部依赖）而非 `lunr`：

- `minisearch` 对中文支持更好（内置 Unicode 分词，无需额外插件）
- API 更简洁，支持字段权重配置
- 更小的包体积（30KB vs 100KB+）

#### 2.1.2 索引设计

```typescript
// MiniSearch 索引配置
const INDEX_CONFIG = {
  fields: ['title', 'content', 'category'],
  storeFields: ['id', 'heading', 'documentTitle', 'categoryName'],
  searchOptions: {
    boost: { title: 3, content: 1.5, category: 1 },
    prefix: true,       // 前缀匹配（如"年"匹配"年假"）
    fuzzy: 0.2,         // 模糊匹配（容忍 20% 拼写差异）
  },
};
```

- `title` = `heading + ' ' + documentTitle`（权重最高）
- `content`（权重次之）
- `category`（辅助）

#### 2.1.3 生命周期

- **构建时机**：文档加载完成时（应用启动 / 文档热更新），调用 `buildIndex(allChunks)`
- **存储方式**：纯内存（与现有架构一致，无需持久化）
- **查询接口**：`search(query: string, topK: number): RAGSearchResult[]`（签名不变）
- **降级行为**：索引未构建时返回空数组

#### 2.1.4 分数归一化

BM25 原始分数 → Min-Max 归一化 → `[0, 1]` 区间，与向量检索分数同范围：

```typescript
private normalizeScores(results: RAGSearchResult[]): RAGSearchResult[] {
  const scores = results.map(r => r.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return results.map(r => ({ ...r, normalizedScore: 1.0 }));
  return results.map(r => ({
    ...r,
    normalizedScore: (r.score - min) / (max - min),
  }));
}
```

### 2.2 同义词扩展

#### 2.2.1 同义词词典

新增 `apps/api/src/rag/synonyms.ts`，维护 HR 领域同义词映射表：

```typescript
export const SYNONYM_MAP: Record<string, string[]> = {
  '年假': ['年休假', '带薪年假', '带薪休假', 'annual leave'],
  '病假': ['病事假', '医疗假', '病休', '就医假'],
  '医保': ['医疗保险', '医保卡', '基本医疗保险'],
  '社保': ['社会保险', '五险', '五险一金'],
  '公积金': ['住房公积金', '住房基金'],
  '加班': ['加班加点', '超时工作', '延时工作'],
  '调休': ['补休', '调休假'],
  '报销': ['报账', '费用报销', '差旅报销'],
  '入职': ['报到', '新员工', '新人'],
  '离职': ['辞职', '辞退', '解除劳动合同'],
  '绩效': ['绩效考核', 'KPI', 'OKR'],
  '薪资': ['工资', '薪水', '薪酬', '待遇', '收入'],
  '晋升': ['升职', '晋级', '提拔'],
  '福利': ['员工福利', '企业福利', '公司福利'],
  '打卡': ['考勤打卡', '签到', '上下班打卡'],
  '补助': ['补贴', '津贴', '补助金'],
};

// 最多扩展 3 个同义词，单字不扩展
export const MAX_SYNONYM_EXPANSION = 3;
```

#### 2.2.2 查询扩展策略

```typescript
expandQuery(query: string): string {
  let expanded = query;
  for (const [term, synonyms] of Object.entries(SYNONYM_MAP)) {
    if (query.includes(term)) {
      // 取前 MAX_SYNONYM_EXPANSION 个同义词
      const additions = synonyms.slice(0, MAX_SYNONYM_EXPANSION).join(' ');
      expanded += ' ' + additions;
    }
  }
  return expanded;
}
```

- 仅当查询包含核心词时才扩展（避免过度扩展引入噪声）
- 每组最多扩展 3 个同义词
- 单字不触发扩展

### 2.3 查询分类器 + 动态权重

#### 2.3.1 查询分类器

新增 `apps/api/src/rag/query-classifier.ts`：

```typescript
export type QueryCategory = 'exact-keyword' | 'semantic' | 'mixed';

export interface QueryClassification {
  category: QueryCategory;
  confidence: number;      // 分类置信度 [0, 1]
  vectorWeight: number;
  keywordWeight: number;
}
```

**分类规则**：

| 类别 | 特征 | 示例 | 向量权重 | 关键词权重 |
|------|------|------|---------|-----------|
| `exact-keyword` | 包含 ≥2 个 HR_KEYWORDS，无口语化表述 | "年假怎么请"、"报销流程" | 0.2 | 0.8 |
| `semantic` | 口语化、无明确关键词、以描述性语言提问 | "我想休息一段时间"、"身体不舒服怎么办" | 0.7 | 0.3 |
| `mixed` | 包含少量关键词 + 部分口语化描述 | "请病假要扣钱吗" | 0.4 | 0.6 |

**分类器实现（基于特征规则，不依赖 ML）**：

```typescript
classify(query: string): QueryClassification {
  const keywordMatches = HR_KEYWORDS.filter(kw => query.includes(kw));
  const hasColloquialMarkers = /[疑问语气词]|感觉|想|怎么|怎么样|如何/.test(query);
  const keywordDensity = keywordMatches.length / query.length;

  if (keywordDensity > 0.15 && keywordMatches.length >= 2 && !hasColloquialMarkers) {
    return { category: 'exact-keyword', confidence: 0.9, vectorWeight: 0.2, keywordWeight: 0.8 };
  }
  if (keywordMatches.length === 0 || (hasColloquialMarkers && keywordDensity < 0.08)) {
    return { category: 'semantic', confidence: 0.85, vectorWeight: 0.7, keywordWeight: 0.3 };
  }
  return { category: 'mixed', confidence: 0.8, vectorWeight: 0.4, keywordWeight: 0.6 };
}
```

#### 2.3.2 动态权重集成

在 `RAGService.orchestrate()` 中，替换硬编码的 `VECTOR_WEIGHT / KEYWORD_WEIGHT` 为动态权重：

```typescript
async *orchestrate(query, ...): AsyncGenerator<StreamChunk> {
  //  动态权重分类
  const classification = this.queryClassifier.classify(query);
  this.logger.log(`Query classified as "${classification.category}" → v:${classification.vectorWeight} k:${classification.keywordWeight}`);

  // ... 检索 ...

  // 使用动态权重合并
  const merged = this.mergeResults(vectorResults, keywordResults, classification);
}
```

### 2.4 接口兼容性

- `RAGSearchResult`、`MergedResult`、`SourceCitation` 接口不变
- `RAGService.orchestrate()` 签名不变
- `KeywordSearchService.search()` 签名从 `(query, chunks, topK)` 改为 `(query, topK)`——调用处同步修改
- SSE 流结构不变（无前端变更）

---

## 3. 实现任务分解

| Task ID | 描述 | 涉及文件 |
|---------|------|---------|
| T-00 | 定位所有涉及混合检索/权重描述的本地 md 文件并确认修改范围 | `README.md`, `ARCHITECTURE.md`, `PRD.md`, `knowledge/HR-RAG-全栈技术深度解析.md`, `knowledge/index.md`, `specs/modules/rag-spec.md`, `specs/modules/chat-spec.md` |
| T-01 | 安装 `minisearch` 依赖 | `apps/api/package.json` |
| T-02 | 新增同义词词典 `synonyms.ts` | `apps/api/src/rag/synonyms.ts`（新） |
| T-03 | 新增查询分类器 `query-classifier.ts` | `apps/api/src/rag/query-classifier.ts`（新） |
| T-04 | 重写 `KeywordSearchService` 为 BM25 引擎 | `apps/api/src/rag/keyword-search.service.ts` |
| T-05 | 更新 `RAGService` 集成动态权重 | `apps/api/src/rag/rag.service.ts` |
| T-06 | 新增 BM25 + 同义词 + 动态权重单元测试 | `keyword-search.service.spec.ts`（新），`rag.service.spec.ts`（更新） |
| T-07 | 更新 `rag-spec.md` 修正合并策略描述 | `specs/modules/rag-spec.md` |
| T-08 | 运行完整回归验证 | 全量验证 |
| T-09 | 同步更新所有本地 md 文件中关于混合检索/权重相关描述 | `README.md`, `ARCHITECTURE.md`, `PRD.md`, `knowledge/HR-RAG-全栈技术深度解析.md`, `knowledge/index.md`, `specs/modules/chat-spec.md` |

---

## 4. 测试用例

### 4.1 单元测试（新增）

#### keyword-search.service.spec.ts

```
describe('KeywordSearchService with BM25')
  - BM25 计算相关性分数（长文档 vs 短文档归一化验收）
  - 标题匹配权重高于正文匹配
  - 同义词扩展后召回相关文档（"医保" → 命中"医疗保险"文档）
  - 无匹配时返回空数组
  - 索引未构建时返回空数组
  - 前缀匹配（"年" 匹配 "年假"）

describe('QueryClassifier')
  - "年假怎么请" → exact-keyword
  - "我想休息一段时间" → semantic
  - "请病假要扣钱吗" → mixed
  - "报销" → exact-keyword
```

### 4.2 集成测试（更新 rag.service.spec.ts）

```
describe('mergeResults with dynamic weights')
  - exact-keyword 查询使用 (0.2, 0.8) 权重
  - semantic 查询使用 (0.7, 0.3) 权重
  - mixed 查询使用 (0.4, 0.6) 权重（默认）
```

### 4.3 场景验收（手动）

| 测试查询 | 预期行为 |
|---------|---------|
| "年假怎么请" | 分类为 `exact-keyword`，关键词权重 0.8，Top-1 命中《年假制度》 |
| "医保报销流程" | 同义词扩展后命中「医疗保险」相关文档 |
| "我想休息一段时间" | 分类为 `semantic`，向量权重 0.7，能召回年假相关文档 |
| "请病假要扣钱吗" | 分类为 `mixed`，病假相关文档出现在 Top-3 |
| "公司食堂在哪里" | 仍应被拒绝（无相关文档，hybridScore < 0.5） |

---

## 5. 验收标准

- [ ] `minisearch` 已添加到 `apps/api/package.json`
- [ ] `KeywordSearchService` 使用 MiniSearch BM25 引擎，支持索引构建和查询
- [ ] `synonyms.ts` 包含 ≥15 组 HR 领域同义词映射
- [ ] `query-classifier.ts` 支持 exact-keyword / semantic / mixed 三类分类
- [ ] `RAGService.mergeResults()` 使用动态权重替代硬编码 0.4/0.6
- [ ] `RAGService.orchestrate()` 调用方式更新（不再传 `allChunks` 给 keywordSearch）
- [ ] 所有现有 API 端点行为不变
- [ ] `specs/modules/rag-spec.md` 修正为准确描述（去掉"RRF 简化版"误标）
- [ ] 现有 E2E 测试全部通过（无回归）
- [ ] `pnpm lint && pnpm format:check` 通过
- [ ] `pnpm build` 成功
- [ ] `pnpm test` 全部通过
- [ ] `pnpm test:e2e` 全部通过


---

## 6. 本地文档同步更新清单

代码变更完成后，必须逐文件更新以下文档中涉及「混合检索权重」「关键词检索」「RRF」的描述，确保与代码实现一致：

| 文件 | 需更新的内容 |
|------|------------|
|  | 删除「RRF 简化版」误标；补充动态权重说明；BM25 替换手工词频 |
|  | 关键词检索流程描述更新为 BM25 |
|  | 核心特性中「向量检索(权重0.4) + 关键词检索(权重0.6)」改为「BM25 关键词检索 + 查询自适应动态权重」；目录结构中 rag/ 描述更新 |
|  | 检索流程图更新：关键词检索标注为 BM25 |
|  | 基础 RAG 问答描述更新 |
|  | 多处权重描述更新：混合检索算法详解、关键词检索描述、权重代码示例、面试考点「0.4+0.6 怎么确定」、流程图、性能指标、来源贡献说明、调权建议 |
|  | 关键词检索模块描述更新 |

### 更新原则

- 将「向量检索(权重0.4) + 关键词检索(权重0.6)」改为「BM25 关键词检索 + 查询自适应动态权重（exact-keyword: 0.2/0.8, semantic: 0.7/0.3, mixed: 0.4/0.6）」
- 将「手工词频累加」改为「MiniSearch BM25 索引引擎」
- 将「RRF 简化版」改为「加权分数合并（支持查询自适应动态权重）」
- 将「关键词检索」的实现描述更新为 BM25 + 同义词扩展
- 面试考点中关于「0.4+0.6 怎么确定」的问答更新为解释动态权重的分类逻辑与三种预设场景

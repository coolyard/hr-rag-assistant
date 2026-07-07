## 变更描述

将 RAG 关键词检索从手工词频累加升级为 **BM25（MiniSearch）+ 同义词扩展**，并引入 **QueryClassifier 查询自适应动态权重**。

- **BM25 引擎**：替代原有手工词频计分，解决 TF-IDF 权重缺失和文档长度归一化问题
- **同义词词典**："医保" → "医疗保险"，"病假" → "医疗假/病休" 等 16 组 HR 领域同义词映射
- **查询分类器**：自动识别精确关键词查询 / 语义口语化查询 / 混合查询，动态调整向量 vs 关键词的合并权重
- **Spec 修正**：`rag-spec.md` 去掉"RRF 简化版"误标，补充动态权重说明

后端纯算法升级，零前端变更，保持所有现有接口完全兼容。

## 关联 Task

| Task ID | 描述 | 涉及文件 |
|---------|------|---------|
| T-00 | 定位所有涉及混合检索/权重描述的本地 md 文件 | README.md, ARCHITECTURE.md, PRD.md, knowledge/*.md, specs/**/*.md |
| T-01 | 安装 minisearch 依赖 | apps/api/package.json |
| T-02 | 新增同义词词典 | `apps/api/src/rag/synonyms.ts`（新） |
| T-03 | 新增查询分类器 | `apps/api/src/rag/query-classifier.ts`（新） |
| T-04 | 重写 KeywordSearchService 为 BM25 引擎 | `apps/api/src/rag/keyword-search.service.ts` |
| T-05 | 更新 RAGService 集成动态权重 | `apps/api/src/rag/rag.service.ts` |
| T-06 | 新增 BM25 + 同义词 + 动态权重单元测试 | `keyword-search.service.spec.ts`（新），`rag.service.spec.ts`（更新） |
| T-07 | 更新 rag-spec.md 修正合并策略描述 | `specs/modules/rag-spec.md` |
| T-08 | 完整回归验证 | 全量验证 |
| T-09 | 同步更新所有本地 md 文件中关于混合检索/权重相关描述 | README.md, ARCHITECTURE.md, PRD.md, knowledge/*.md, specs/*.md |

## 验收标准

### BM25 引擎

- [ ] `minisearch` 已添加到 `apps/api/package.json`
- [ ] `KeywordSearchService` 提供 `buildIndex()` 方法，支持文档加载时构建索引
- [ ] `KeywordSearchService.search()` 使用 MiniSearch BM25，支持前缀/模糊匹配
- [ ] 标题字段 boost=3，正文字段 boost=1.5
- [ ] BM25 分数通过 Min-Max 归一化到 [0, 1]
- [ ] 索引未构建时返回空数组（不崩溃）

### 同义词扩展

- [ ] `synonyms.ts` 包含 ≥16 组 HR 领域同义词映射
- [ ] 查询"医保报销"能召回"医疗保险"相关文档
- [ ] 单字不触发扩展（避免"假"过度匹配）
- [ ] 每组最多扩展 3 个同义词

### 查询分类器

- [ ] `QueryClassifier` 支持 exact-keyword / semantic / mixed 三类分类
- [ ] "年假怎么请" → exact-keyword（关键词密集，无口语化）
- [ ] "我想休息一段时间" → semantic（口语化，无关键词）
- [ ] "请病假要扣钱吗" → mixed（含少量关键词 + 口语化）
- [ ] 空字符串不崩溃

### 动态权重

- [ ] `RAGService.mergeResults()` 接受 `QueryClassification` 参数
- [ ] exact-keyword 使用 (0.2, 0.8) 权重
- [ ] semantic 使用 (0.7, 0.3) 权重
- [ ] mixed 使用 (0.4, 0.6) 权重（默认）
- [ ] `RAGService.orchestrate()` 中调用 `classify()` 获取动态权重

### Spec 更新

- [ ] `rag-spec.md` 去掉"RRF 简化版"误标
- [ ] 补充动态权重说明章节

### 文档同步

- [ ] `specs/modules/rag-spec.md` — 删除 RRF 误标，补充动态权重
- [ ] `specs/modules/chat-spec.md` — 关键词检索更新为 BM25
- [ ] `README.md` — 核心特性/目录结构检索描述更新
- [ ] `ARCHITECTURE.md` — 检索流程图更新
- [ ] `PRD.md` — RAG 问答功能描述更新
- [ ] `knowledge/HR-RAG-全栈技术深度解析.md` — 多处检索/权重描述更新
- [ ] `knowledge/index.md` — 模块描述更新

### 回归验证

- [ ] `pnpm test` — 全部单元测试通过（含新增 BM25/Classifier 测试）
- [ ] `pnpm test:e2e` — 全部 E2E 测试通过
- [ ] `pnpm lint` — 0 error
- [ ] `pnpm format:check` — 0 warning
- [ ] `pnpm build` — 构建成功

## Spec 变更

- 新增 `changes/features/rag-hybrid-search-upgrade/spec.md`
- 新增 `changes/features/rag-hybrid-search-upgrade/instruction.md`
- 新增 `apps/api/src/rag/synonyms.ts`（同义词词典）
- 新增 `apps/api/src/rag/query-classifier.ts`（查询分类器）
- 新增 `apps/api/src/rag/keyword-search.service.spec.ts`（BM25 专项测试）
- 修改 `apps/api/package.json`（新增 `minisearch` 依赖）
- 修改 `apps/api/src/rag/keyword-search.service.ts`（重写为 BM25 引擎）
- 修改 `apps/api/src/rag/rag.service.ts`（集成动态权重）
- 修改 `specs/modules/rag-spec.md`（修正合并策略描述）
- 修改 `apps/api/src/rag/rag.service.spec.ts`（适配新接口签名）
- 修改 `specs/modules/chat-spec.md`（关键词检索流程更新为 BM25）
- 修改 `README.md`（核心特性和目录结构中的检索描述更新）
- 修改 `ARCHITECTURE.md`（检索流程图更新）
- 修改 `PRD.md`（RAG 问答功能描述更新）
- 修改 `knowledge/HR-RAG-全栈技术深度解析.md`（多处检索/权重描述更新）
- 修改 `knowledge/index.md`（模块描述更新）

## 测试方式

1. `pnpm install` — 安装 minisearch 依赖
2. `pnpm test` — 运行全部单元测试（含新增 BM25/同义词/分类器测试）
3. `pnpm test:e2e` — 运行全部 E2E 测试确保无回归
4. 手动验证场景（可选，需启动后端）：
   - 提问"年假怎么请" → 精确匹配，关键词权重高
   - 提问"医保报销" → 同义词扩展后召回医疗保险文档
   - 提问"我想休息" → 语义查询，向量权重高

## 审查重点

- **minisearch vs lunr**：选择 minisearch 是因为对中文支持更好、API 更简洁、体积更小；如果审查时认为 lunr 更好，需同步修改 T-01 和 T-04
- **同义词词典的覆盖范围**：当前 16 组映射是否覆盖主要 HR 场景？
- **查询分类器的规则阈值**：keywordDensity > 0.15、colloquialMarkers 正则是否合理？是否需要根据实际效果调参？
- **BM25 索引的生命周期**：当前在文档加载时一次性构建，如果后续支持动态文档增删，需扩容 `buildIndex()` 为 `addDocuments()` / `removeDocuments()`
- **分数归一化的边界情况**：当所有 BM25 分数相同时（max === min），所有归一化分数设为 1.0，这是否合理？

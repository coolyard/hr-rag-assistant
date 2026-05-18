# 模块 Spec：VectorStore（向量存储模块）

> 本模块定义向量数据的存储与检索规范，是 RAG 检索的基础设施。当前为内存实现，未来可一键切换 Chroma/Milvus。
>
> 对应变更域：phase-1-infrastructure

---

## 1. 范围边界

### 1.1 包含
- 向量存储接口定义（IVectorStore）
- 内存实现（In-Memory VectorStore）
- 余弦相似度计算
- 向量增删查接口
- 启动时索引加载

### 1.2 不包含
- ❌ Embedding 生成（见 embedding-spec.md）
- ❌ 文档分块（见 chunk-spec.md）
- ❌ 检索算法（见 rag-spec.md）
- ❌ Chroma/Milvus 实现（扩展点）

---

## 2. 接口定义

### 2.1 IVectorStore 接口

```typescript
interface DocumentMeta {
  chunkId: string;
  documentName: string;
  documentTitle: string;
  category: string;
  categoryName: string;
  heading: string;
  content: string;
  charCount: number;
}

interface SearchResult {
  chunkId: string;
  content: string;
  documentName: string;
  documentTitle: string;
  category: string;
  categoryName: string;
  heading: string;
  similarity: number;      // 余弦相似度 [0, 1]
  metadata: DocumentMeta;
}

interface IVectorStore {
  /**
   * 添加向量到存储
   */
  add(id: string, embedding: number[], metadata: DocumentMeta): void;

  /**
   * 向量相似度搜索
   * @param queryEmbedding 查询向量（必须已归一化）
   * @param topK 返回最相似的 K 个结果
   */
  search(queryEmbedding: number[], topK: number): SearchResult[];

  /**
   * 清空所有向量
   */
  clear(): void;

  /**
   * 获取当前存储的向量数量
   */
  count(): number;

  /**
   * 根据 chunkId 查询单个向量
   */
  get(id: string): { embedding: number[]; metadata: DocumentMeta } | null;
}
```

---

## 3. 内存实现规范

### 3.1 数据结构

```typescript
class InMemoryVectorStore implements IVectorStore {
  private vectors: Map<string, {
    embedding: number[];     // 768 维浮点数组
    metadata: DocumentMeta;
  }>;

  constructor() {
    this.vectors = new Map();
  }
}
```

### 3.2 余弦相似度计算

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`维度不匹配: ${a.length} vs ${b.length}`);
  }

  // 由于使用归一化向量，可简化为点积
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }

  return dotProduct;  // 归一化后点积 = 余弦相似度
}
```

### 3.3 搜索实现

```typescript
search(queryEmbedding: number[], topK: number): SearchResult[] {
  const results: SearchResult[] = [];

  for (const [id, data] of this.vectors) {
    const similarity = cosineSimilarity(queryEmbedding, data.embedding);

    results.push({
      chunkId: id,
      content: data.metadata.content,
      documentName: data.metadata.documentName,
      documentTitle: data.metadata.documentTitle,
      category: data.metadata.category,
      categoryName: data.metadata.categoryName,
      heading: data.metadata.heading,
      similarity,
      metadata: data.metadata,
    });
  }

  // 按相似度降序排序，取 Top-K
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
```

### 3.4 性能优化

当前数据量（~50-100 个片段）下，全量遍历完全足够：
- 时间复杂度：O(N × D)，N=100, D=768 → 约 76,800 次操作
- 单次搜索耗时：< 1ms

未来数据量增长后，可考虑：
- 局部敏感哈希（LSH）
- HNSW 索引
- 切换到 Chroma / Milvus

---

## 4. 向量维度规范

| 参数 | 值 | 说明 |
|------|-----|------|
| `dimensions` | 768 | nomic-embed-text 输出维度 |
| `value_range` | [-1, 1] | 归一化后的向量值范围 |
| `norm` | ≈ 1.0 | L2 范数 |

**维度校验**：
```typescript
function validateEmbedding(embedding: number[]): void {
  if (embedding.length !== 768) {
    throw new Error(`向量维度错误: 期望 768, 实际 ${embedding.length}`);
  }

  // 检查是否为 NaN / Infinity
  if (embedding.some(v => !Number.isFinite(v))) {
    throw new Error('向量包含非法数值 (NaN 或 Infinity)');
  }
}
```

---

## 5. 索引生命周期

### 5.1 启动时加载

```
后端启动
    │
    ▼
DocumentLoader 加载所有文档 → 分块
    │
    ▼
EmbeddingService 为每个 chunk 生成向量
    │
    ▼
VectorStore.add(id, embedding, metadata) 逐个存入
    │
    ▼
控制台输出: "[VectorStore] 已建立 N 条索引"
```

### 5.2 上传后重建

```
接收新文档上传
    │
    ▼
保存文件到 docs/hr-documents/
    │
    ▼
VectorStore.clear() 清空旧索引
    │
    ▼
重新加载所有文档（内置 + 新上传）
    │
    ▼
重新生成所有 Embedding
    │
    ▼
重建 VectorStore
```

> ⚠️ 当前实现为全量重建，非增量更新。数据量大时需优化为增量索引。

---

## 6. 错误处理

| 场景 | 处理策略 |
|------|---------|
| 维度不匹配 | 抛出 `DimensionMismatchError` |
| 向量含 NaN | 抛出 `InvalidEmbeddingError` |
| 搜索空存储 | 返回空数组 |
| 重复 ID 添加 | 覆盖旧数据 |
| 查询 ID 不存在 | 返回 `null` |

---

## 7. 验收标准

- [ ] 存储 100 个 768 维向量，内存占用 < 2MB
- [ ] 查询向量返回结果按相似度降序排列
- [ ] 相同文本的向量相似度 ≈ 1.0
- [ ] 无关文本的向量相似度 < 0.5
- [ ] 维度不匹配时抛出明确错误
- [ ] 清空后 `count()` 返回 0
- [ ] 上传新文档后，旧文档 + 新文档都能被检索到

---

## 8. 扩展点：切换到 Chroma

```typescript
// 未来实现 ChromaVectorStore，保持相同接口
class ChromaVectorStore implements IVectorStore {
  private collection: Collection;

  async add(id: string, embedding: number[], metadata: DocumentMeta): Promise<void> {
    await this.collection.add({
      ids: [id],
      embeddings: [embedding],
      metadatas: [metadata],
    });
  }

  async search(queryEmbedding: number[], topK: number): Promise<SearchResult[]> {
    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
    });
    // 转换为 SearchResult[]
  }
}
```

---

## 9. 与其他模块的关系

```
VectorStore
    ├── 被 RAGService 依赖（向量检索）
    ├── 被 DocumentLoader 依赖（索引存储）
    ├── 被 DocumentUploadService 依赖（重建索引）
    └── 实现 IVectorStore 接口，可替换
```

---

## 10. Spec 演进记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-18 | v1.0 | 初始版本，从 ARCHITECTURE.md 和 phase-1 spec 中提取 VectorStore 规范 |

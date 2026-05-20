# 模块 Spec：Embedding（向量生成模块）

> 本模块定义文本 Embedding 生成的规范，将自然语言转化为语义向量，是 RAG 检索的基础依赖。
>
> 对应变更域：phase-1-infrastructure

---

## 1. 范围边界

### 1.1 包含

- Ollama Embedding API 调用封装
- 文本预处理（截断、清理）
- 向量归一化
- 批量 Embedding 生成（文档索引场景）
- 错误重试与降级策略

### 1.2 不包含

- ❌ 向量存储（见 vector-spec.md）
- ❌ 文档分块（见 chunk-spec.md）
- ❌ 检索算法（见 rag-spec.md）
- ❌ 其他 Embedding 模型实现（扩展点）

---

## 2. 模型配置

| 参数              | 值                       | 说明               |
| ----------------- | ------------------------ | ------------------ |
| `model`           | `nomic-embed-text`       | Ollama 本地模型    |
| `dimensions`      | 768                      | 输出向量维度       |
| `normalize`       | `true`                   | 输出归一化向量     |
| `ollama_base_url` | `http://localhost:11434` | Ollama 服务地址    |
| `timeout`         | 30000                    | 单次请求超时 30 秒 |
| `max_retries`     | 3                        | 失败重试次数       |
| `batch_size`      | 10                       | 批量处理批次大小   |

---

## 3. 接口定义

### 3.1 IEmbeddingService 接口

```typescript
interface IEmbeddingService {
  /**
   * 将单条文本嵌入为向量
   * @param text 输入文本
   * @returns 768 维归一化向量
   * @throws Error 当 Ollama 不可用或模型未加载时
   */
  embed(text: string): Promise<number[]>;

  /**
   * 批量嵌入多条文本
   * @param texts 文本数组
   * @returns 向量数组，与输入顺序一致
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * 检查 Embedding 服务是否可用
   */
  healthCheck(): Promise<{ available: boolean; model: string }>;
}
```

### 3.2 Ollama API 调用规范

**请求**：

```http
POST http://localhost:11434/api/embeddings
Content-Type: application/json

{
  "model": "nomic-embed-text",
  "prompt": "年假怎么请？"
}
```

**响应**：

```json
{
  "embedding": [0.0234, -0.0156, 0.0891, ...]  // 768 个浮点数
}
```

---

## 4. 文本预处理规范

### 4.1 输入清理

```typescript
function preprocessText(text: string): string {
  // 1. 去除前后空白
  text = text.trim();

  // 2. 压缩连续空白字符为单个空格
  text = text.replace(/\s+/g, ' ');

  // 3. 去除 Markdown 格式符号（Embedding 场景保留语义即可）
  text = text.replace(/[#*`\[\]()]/g, '');

  // 4. 截断至最大长度（nomic-embed-text 上下文约 2048 tokens）
  if (text.length > 4000) {
    text = text.substring(0, 4000);
  }

  return text;
}
```

### 4.2 特殊场景处理

| 场景                   | 处理策略                                  |
| ---------------------- | ----------------------------------------- |
| 空字符串               | 返回零向量（768 个 0）或抛出错误          |
| 纯空白字符             | 同空字符串处理                            |
| 超长文本（>4000 字符） | 截断至 4000 字符                          |
| 包含特殊符号           | 保留中文/英文/数字，去除无意义符号        |
| 多语言混合             | 直接输入模型，nomic-embed-text 支持多语言 |

---

## 5. 批量处理规范

### 5.1 文档索引场景

当系统启动或上传新文档时，需要为所有 chunk 生成 Embedding：

```typescript
async function indexDocuments(chunks: DocumentChunk[]): Promise<void> {
  // 1. 按 batch_size 分组
  const batches = chunkArray(chunks, BATCH_SIZE);

  for (const batch of batches) {
    // 2. 并发调用 embed（控制并发数）
    const embeddings = await Promise.all(batch.map((c) => embeddingService.embed(c.content)));

    // 3. 存入 VectorStore
    for (let i = 0; i < batch.length; i++) {
      vectorStore.add(batch[i].id, embeddings[i], batch[i].metadata);
    }
  }
}
```

### 5.2 进度报告

批量处理时，控制台输出进度：

```
[Embedding] 正在处理批次 3/12 (25%)...
[Embedding] 已完成 120/118 个片段的 Embedding 生成
```

---

## 6. 错误处理

| 场景               | 处理策略                                                               |
| ------------------ | ---------------------------------------------------------------------- |
| Ollama 未启动      | 重试 3 次后抛出 `OllamaConnectionError`，后端返回 503                  |
| 模型未下载         | 抛出 `ModelNotFoundError`，提示用户运行 `ollama pull nomic-embed-text` |
| 请求超时           | 重试，指数退避（1s → 2s → 4s）                                         |
| 返回向量维度 ≠ 768 | 抛出 `DimensionMismatchError`，记录日志                                |
| 批量处理部分失败   | 失败项单独重试，成功项继续                                             |

---

## 7. 验收标准

- [ ] 输入"年假怎么请？"，返回 768 维浮点数组
- [ ] 返回向量的 L2 范数 ≈ 1.0（已归一化）
- [ ] 语义相似文本的向量余弦相似度 > 0.7
- [ ] 语义无关文本的向量余弦相似度 < 0.3
- [ ] Ollama 未启动时，3 次重试后返回友好错误
- [ ] 批量处理 50 个 chunk，控制台显示进度
- [ ] 空字符串输入，处理策略明确（零向量或报错）

---

## 8. 与其他模块的关系

```
EmbeddingService
    ├── 被 RAGService 依赖（问题向量化）
    ├── 被 DocumentLoader 依赖（文档 chunk 向量化）
    ├── 被 DocumentUploadService 依赖（新文档索引）
    └── 调用 Ollama /api/embeddings
```

---

## 9. Spec 演进记录

| 日期       | 版本 | 变更内容                                                      |
| ---------- | ---- | ------------------------------------------------------------- |
| 2026-05-18 | v1.0 | 初始版本，从 AI-SPEC.md 和 phase-1 spec 中提取 Embedding 规范 |

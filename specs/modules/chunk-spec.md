# 模块 Spec：Chunk（文档分块模块）

> 本模块定义 HR Markdown 文档的分块策略与实现规范。分块质量直接影响 RAG 检索的准确性。
>
> 对应变更域：phase-1-infrastructure

---

## 1. 范围边界

### 1.1 包含
- Markdown 文档解析
- 分块策略实现（按标题切分 + 长度控制）
- Chunk 元数据生成（来源文档、分类、标题层级）
- 重叠策略
- 过滤策略
- 新文档上传后的自动分块

### 1.2 不包含
- ❌ Embedding 生成（见 embedding-spec.md）
- ❌ 向量存储（见 vector-spec.md）
- ❌ 文件上传 HTTP 接口（见 document-spec.md）
- ❌ PDF/Word 解析（PRD Out of Scope）

---

## 2. 分块策略

### 2.1 核心参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `split_by` | `h2`（Markdown 二级标题 `##`） | 主要切分依据 |
| `max_chunk_size` | 512 | 单个 chunk 最大字符数 |
| `overlap` | 50 | 相邻 chunk 重叠字符数 |
| `min_chunk_size` | 20 | 过滤小于此长度的 chunk |
| `max_chunks_per_doc` | 10 | 单个文档最多保留 chunk 数 |

### 2.2 分块算法

```typescript
interface DocumentChunk {
  id: string;                    // 唯一标识，如 `doc-annual_leave-chunk-0`
  content: string;               // chunk 文本内容
  documentName: string;          // 来源文件名，如 "年假制度.md"
  documentTitle: string;         // 文档标题，如 "年假制度"
  category: string;              // 分类标识，如 "annual_leave"
  categoryName: string;          // 分类中文名，如 "年假"
  heading: string;               // 所属二级标题，如 "年假申请规则"
  headingLevel: number;          // 标题层级（2）
  index: number;                 // 在文档中的序号
  charCount: number;             // 字符数
}

function splitDocument(
  content: string,
  metadata: DocumentMeta
): DocumentChunk[] {
  // Step 1: 提取文档主标题（第一个 # 标题）
  const documentTitle = extractMainTitle(content);

  // Step 2: 按 ## 切分
  const sections = content.split(/^##\s+/m).filter(Boolean);

  // Step 3: 处理每个 section
  const chunks: DocumentChunk[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const heading = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();

    // Step 4: 如果 section 过长，进一步切分
    const subChunks = splitBySize(body, max_chunk_size, overlap);

    for (let j = 0; j < subChunks.length; j++) {
      const chunkContent = j === 0
        ? `## ${heading}\n${subChunks[j]}`  // 第一个 subChunk 保留标题
        : subChunks[j];

      chunks.push({
        id: `${metadata.id}-chunk-${chunks.length}`,
        content: chunkContent,
        documentName: metadata.filename,
        documentTitle,
        category: metadata.category,
        categoryName: metadata.categoryName,
        heading,
        headingLevel: 2,
        index: chunks.length,
        charCount: chunkContent.length,
      });
    }
  }

  // Step 5: 过滤
  const filtered = chunks.filter(c => c.charCount >= min_chunk_size);

  // Step 6: 限制最大数量
  return filtered.slice(0, max_chunks_per_doc);
}
```

### 2.3 按长度进一步切分

当单个 `##` 节内容超过 512 字符时：

```typescript
function splitBySize(text: string, maxSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - overlap;  // 重叠 50 字符
    if (start >= text.length) break;
  }

  return chunks;
}
```

---

## 3. 元数据生成

### 3.1 文档分类映射

| 文件名关键词 | 分类标识 | 分类名 | 颜色 |
|-------------|---------|--------|------|
| 年假 | `annual_leave` | 年假 | `#E3F2FD` |
| 报销 | `reimbursement` | 报销 | `#E8F5E9` |
| 晋升 | `promotion` | 晋升 | `#FFF3E0` |
| 考勤 | `attendance` | 考勤 | `#F3E5F5` |
| 福利 | `welfare` | 福利 | `#FFFDE7` |
| 其他 | `custom` | 自定义 | `#F5F5F5` |

### 3.2 分类识别规则

```typescript
function detectCategory(filename: string): DocumentCategory {
  const name = filename.toLowerCase();
  if (name.includes('年假') || name.includes('休假')) return categories.ANNUAL_LEAVE;
  if (name.includes('报销')) return categories.REIMBURSEMENT;
  if (name.includes('晋升') || name.includes('升职')) return categories.PROMOTION;
  if (name.includes('考勤') || name.includes('打卡')) return categories.ATTENDANCE;
  if (name.includes('福利') || name.includes('待遇')) return categories.WELFARE;
  return categories.CUSTOM;
}
```

---

## 4. 文档加载流程

```
启动后端 / 上传新文档
    │
    ▼
读取 docs/hr-documents/*.md
    │
    ▼
逐文件解析
    ├── 提取主标题（第一个 #）
    ├── 识别分类（基于文件名关键词）
    └── 按 ## 切分 → 长度控制 → 重叠 → 过滤
    │
    ▼
生成 DocumentChunk[]
    │
    ▼
调用 EmbeddingService.embedBatch() → 生成向量
    │
    ▼
存入 VectorStore
    │
    ▼
控制台输出："已加载 N 个文档，共 M 个片段"
```

---

## 5. 内置文档加载规范

### 5.1 加载路径

- **路径**：`docs/hr-documents/`（项目根目录）
- **文件模式**：`*.md`
- **读取时机**：后端启动时自动执行
- **递归**：不递归子目录（仅顶层）

### 5.2 控制台输出格式

```
[DocumentLoader] 扫描目录: /path/to/docs/hr-documents/
[DocumentLoader] 发现 5 个 Markdown 文件
[DocumentLoader] 处理: 年假制度.md → 分类: annual_leave, 7 chunks
[DocumentLoader] 处理: 报销流程.md → 分类: reimbursement, 6 chunks
...
[DocumentLoader] 总计: 5 个文档, 32 个片段
[VectorStore] 已建立 32 条 Embedding 索引
```

---

## 6. 错误处理

| 场景 | 处理策略 |
|------|---------|
| 文件不存在 | 跳过，记录警告日志 |
| 文件为空 | 跳过，记录警告日志 |
| 无 Markdown 标题 | 使用文件名作为标题 |
| 无 ## 二级标题 | 将整个文档作为一个 chunk |
| 文件编码错误 | 尝试 UTF-8，失败则跳过 |
| 分类无法识别 | 默认 `custom` |

---

## 7. 验收标准

- [ ] `年假制度.md` 按 ## 切分，每个 chunk 包含对应的二级标题
- [ ] 单个 section 超长时，正确按 512 字符切分并保留 50 字符重叠
- [ ] 过滤掉长度 < 20 字符的片段
- [ ] 单个文档最多保留 10 个 chunk
- [ ] 正确识别 5 个内置文档的分类（年假/报销/晋升/考勤/福利）
- [ ] 上传新 `.md` 文件后，自动触发分块和索引重建
- [ ] 控制台输出加载进度和统计信息
- [ ] chunk 的元数据包含完整的来源信息（文档名、分类、标题）

---

## 8. 与其他模块的关系

```
DocumentLoader
    ├── 输出 DocumentChunk[]
    ├── 输入到 EmbeddingService → 生成向量
    ├── 输入到 VectorStore → 存储索引
    ├── 被 AppModule 依赖（启动时加载）
    └── 被 DocumentUploadService 依赖（上传后重新加载）
```

---

## 9. Spec 演进记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-18 | v1.0 | 初始版本，从 AI-SPEC.md 和 phase-1 spec 中提取分块规范 |

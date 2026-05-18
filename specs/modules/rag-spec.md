# 模块 Spec：RAG（检索增强生成模块）

> 本模块定义 RAG Pipeline 的完整规范，是系统核心 AI 能力。负责将用户问题转化为精准的知识检索与可信回答生成。
>
> 对应变更域：phase-2-rag-engine

---

## 1. 范围边界

### 1.1 包含
- 混合检索算法（向量检索 + 关键词检索）
- RRF 合并与去重策略
- 检索结果阈值过滤
- Prompt 组装（System Prompt + 历史 + 检索片段）
- 幻觉控制四层防御的前三层
- 置信度标签计算

### 1.2 不包含
- ❌ LLM 生成实现（见 llm-spec.md）
- ❌ Embedding 生成（见 embedding-spec.md）
- ❌ 向量存储实现（见 vector-spec.md）
- ❌ 对话历史管理（见 chat-spec.md）
- ❌ SSE 流式传输（见 chat-spec.md）
- ❌ 回答后校验的 NLP 实现（Layer 3 简单规则版在本模块，复杂 NLP 版不在）

---

## 2. 检索参数（不可随意修改）

| 参数 | 值 | 说明 |
|------|-----|------|
| `vector_top_k` | 3 | 向量检索返回片段数 |
| `keyword_top_k` | 3 | 关键词检索返回片段数 |
| `merge_top_k` | 3 | 合并去重后最终片段数 |
| `similarity_threshold` | 0.5 | 最低相似度阈值 |
| `vector_weight` | 0.4 | 混合检索中向量检索权重 |
| `keyword_weight` | 0.6 | 混合检索中关键词检索权重 |
| `max_history_rounds` | 5 | 多轮对话保留轮数 |
| `max_tokens_estimate` | 28000 | 总上下文 Token 估算上限（qwen2.5:7b 窗口 32768，留 4000+ 给生成） |

> ⚠️ **Spec 锁定**：以上参数变更需更新本 Spec 并重新测试准确率/拒绝率

---

## 3. 混合检索算法

### 3.1 向量检索

```typescript
async function vectorSearch(
  query: string,
  topK: number
): Promise<SearchResult[]> {
  // 1. 生成查询向量
  const queryEmbedding = await embeddingService.embed(query);

  // 2. 在 VectorStore 中搜索
  const results = vectorStore.search(queryEmbedding, topK);

  // 3. 返回带分数的结果
  return results.map(r => ({
    ...r,
    source: 'vector',
    normalizedScore: r.similarity,  // 余弦相似度本身就是 [0,1]
  }));
}
```

### 3.2 关键词检索

**预定义关键词库**（30+ 个中文 HR 关键词）：

```typescript
const HR_KEYWORDS = [
  // 年假
  '年假', '年休假', '带薪休假', '请假', '休假',
  // 报销
  '报销', '发票', '差旅', '交通费', '住宿费', '通讯补贴',
  // 晋升
  '晋升', '升职', '考核', '绩效', '评估', '调薪',
  // 考勤
  '考勤', '打卡', '迟到', '早退', '旷工', '加班', '弹性工作',
  // 福利
  '福利', '社保', '公积金', '医疗保险', '体检', '节日',
  // 通用
  '工资', '薪资', '薪酬', '离职', '入职', '转正', '劳动合同'
];
```

**关键词匹配算法**：

```typescript
// chunks 参数由调用方传入（来自 vectorStore.getAllChunks() 或等价方法）
function keywordSearch(
  query: string,
  chunks: SearchResult[],
  topK: number
): SearchResult[] {
  // 1. 从查询中提取匹配关键词
  const matchedKeywords = HR_KEYWORDS.filter(kw => query.includes(kw));

  // 2. 对每个 chunk 计算匹配分数
  const scored = chunks.map(chunk => {
    let score = 0;

    // 2.1 标题匹配（权重高）
    if (matchedKeywords.some(kw => chunk.heading.includes(kw))) {
      score += 3;
    }

    // 2.2 内容词频匹配
    for (const kw of matchedKeywords) {
      // kw 可能含正则特殊字符（如 '.'），使用时需转义
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      const matches = chunk.content.match(regex);
      if (matches) {
        score += matches.length;
      }
    }

    // 2.3 分类匹配加分
    if (matchedKeywords.some(kw => chunk.categoryName.includes(kw))) {
      score += 2;
    }

    return { ...chunk, score, source: 'keyword' };
  });

  // 3. 归一化分数到 [0,1]
  const maxScore = Math.max(...scored.map(s => s.score), 1);
  return scored
    .map(s => ({ ...s, normalizedScore: s.score / maxScore }))
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, topK);
}
```

### 3.3 合并与去重（RRF 简化版）

```typescript
// VECTOR_WEIGHT 和 KEYWORD_WEIGHT 为模块级常量（见 Section 2）
const VECTOR_WEIGHT = 0.4;
const KEYWORD_WEIGHT = 0.6;

function mergeResults(
  vectorResults: SearchResult[],
  keywordResults: SearchResult[],
  topK: number
): MergedResult[] {
  const merged = new Map<string, MergedResult>();

  // 1. 加入向量结果
  for (const r of vectorResults) {
    merged.set(r.chunkId, {
      ...r,
      hybridScore: r.normalizedScore * VECTOR_WEIGHT,
      sources: ['vector'],
    });
  }

  // 2. 加入关键词结果，已存在则合并分数
  for (const r of keywordResults) {
    const existing = merged.get(r.chunkId);
    if (existing) {
      existing.hybridScore += r.normalizedScore * KEYWORD_WEIGHT;
      existing.sources.push('keyword');
    } else {
      merged.set(r.chunkId, {
        ...r,
        hybridScore: r.normalizedScore * KEYWORD_WEIGHT,
        sources: ['keyword'],
      });
    }
  }

  // 3. 按混合分数排序，取 Top-K
  return Array.from(merged.values())
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, topK);
}
```

---

## 4. 阈值过滤与拒绝策略

### 4.1 触发拒绝的条件（满足任一）

```typescript
function shouldReject(results: MergedResult[], query: string): boolean {
  // 条件 1: 最高相似度 < 0.5
  if (results.length === 0 || results[0].hybridScore < 0.5) {
    return true;
  }

  // 条件 2: 关键词检索无匹配且向量检索最高相似度 < 0.5
  const hasKeywordMatch = results.some(r => r.sources.includes('keyword'));
  const bestVectorScore = results
    .filter(r => r.sources.includes('vector'))
    .map(r => r.similarity)[0] || 0;
  if (!hasKeywordMatch && bestVectorScore < 0.5) {
    return true;
  }

  // 条件 3: 涉及个人隐私
  const privacyPatterns = [
    /\b[\u4e00-\u9fa5]{2,4}\s*的\s*(工资|薪资|薪酬|收入)/,
    /\b(张三|李四|王五|\w{2,4})\s*的\s*(工资|薪资)/,
    /具体员工/,
  ];
  if (privacyPatterns.some(p => p.test(query))) {
    return true;
  }

  // 条件 4: 涉及公司机密
  const secretPatterns = [
    /裁员/,
    /收购|并购/,
    /季度财报.*未公布/,
  ];
  if (secretPatterns.some(p => p.test(query))) {
    return true;
  }

  // 条件 5: 与 HR 制度无关
  const hrRelatedKeywords = [...HR_KEYWORDS, '公司', '制度', '政策', '流程', '规定'];
  const isHrRelated = hrRelatedKeywords.some(kw => query.includes(kw));
  if (!isHrRelated && results[0].hybridScore < 0.6) {
    return true;
  }

  return false;
}
```

### 4.2 拒绝话术（固定不可变）

```
根据现有 HR 文档，无法确认该问题的答案。建议联系 HR 部门获取准确信息。
```

---

## 5. Prompt 组装

### 5.1 System Prompt（固定模板）

```
你是企业 HR 助手，专门回答员工关于公司制度、政策和流程的问题。

## 核心规则
1. 【知识边界】你只能基于以下检索到的 HR 文档片段回答问题，禁止引用外部知识或推测。
2. 【准确性优先】如果文档片段无法完整回答问题，或你不确定，必须明确告知"根据现有 HR 文档，无法确认该问题的答案"。
3. 【来源引用】每个回答必须标注来源文档名称（如"《年假制度》"）。
4. 【隐私保护】涉及**他人**隐私（如具体员工姓名、工资数字）的问题，拒绝回答并提示联系 HR。
5. 【个人数据】如果下方提供了"当前用户个人信息"，用户询问自己的数据时（如"我有多少天年假"），优先基于个人数据回答，并用文档片段补充制度依据。
6. 【语气】使用中文，语气专业、简洁、友好。

## 检索到的文档片段
{{retrieved_chunks}}

## 当前用户个人信息（仅在询问个人相关问题时提供）
{{user_profile}}

## 对话历史
{{conversation_history}}

## 当前问题
{{user_question}}

请基于以上文档片段回答问题。如果文档片段为空或无关，请直接返回拒绝话术。
```

### 5.2 检索片段格式化

```typescript
function formatChunks(chunks: MergedResult[]): string {
  if (chunks.length === 0) return '（无相关文档片段）';

  return chunks.map((c, i) => `
[片段 ${i + 1}] 来源：《${c.documentTitle}》
分类：${c.categoryName}
内容：${c.content}
相关性：${(c.hybridScore * 100).toFixed(1)}%
`).join('\n---\n');
}
```

### 5.3 对话历史格式化

```typescript
function formatHistory(messages: Message[]): string {
  // 保留最近 5 轮
  const recent = messages.slice(-10);

  if (recent.length === 0) return '（无历史对话）';

  return recent.map(m => {
    const role = m.role === 'user' ? '员工' : '助手';
    return `${role}：${m.content}`;
  }).join('\n');
}
```

### 5.4 个人数据注入点

```typescript
// 在 RAGService.orchestrate() 中
async function buildPrompt(
  query: string,
  userId: string,
  chunks: MergedResult[],
  history: Message[]
): Promise<string> {
  // 1. 判断是否为用户个人查询
  const isPersonal = userProfileService.isPersonalQuery(query);

  // 2. 获取用户个人数据（如需要）
  let profileText = '';
  if (isPersonal) {
    const profile = userProfileService.getProfile(userId);
    if (profile) {
      profileText = userProfileService.formatForPrompt(profile);
    }
  }

  // 3. 组装 Prompt
  const systemPrompt = SYSTEM_PROMPT_TEMPLATE
    .replace('{{retrieved_chunks}}', formatChunks(chunks))
    .replace('{{user_profile}}', profileText || '（未提供）')
    .replace('{{conversation_history}}', formatHistory(history))
    .replace('{{user_question}}', query);

  return systemPrompt;
}
```

### 5.5 上下文截断策略

```typescript
function truncateContext(
  systemPrompt: string,
  history: string,
  chunks: string,
  question: string,
  messages: Message[],          // 原始消息列表，用于按轮数截断
  maxTokens: number
): { history: string; chunks: string } {
  // 简单估算：1 个中文字 ≈ 1 token，英文 ≈ 0.5 token
  const estimateTokens = (text: string) =>
    text.split('').reduce((sum, c) => sum + (c.charCodeAt(0) > 127 ? 1 : 0.5), 0);

  let total = estimateTokens(systemPrompt) +
              estimateTokens(history) +
              estimateTokens(chunks) +
              estimateTokens(question);

  // 优先保留检索片段，压缩历史
  if (total > maxTokens) {
    // 先压缩历史到 3 轮
    const compressedHistory = formatHistory(messages.slice(-6));
    total = estimateTokens(systemPrompt) +
            estimateTokens(compressedHistory) +
            estimateTokens(chunks) +
            estimateTokens(question);

    if (total > maxTokens) {
      // 再压缩到 1 轮
      return {
        history: formatHistory(messages.slice(-2)),
        chunks,  // 始终保留检索片段
      };
    }

    return { history: compressedHistory, chunks };
  }

  return { history, chunks };
}
```

---

## 6. 幻觉控制四层防御

### Layer 1: 检索阈值过滤（Pre-filter）

- 向量检索 + 关键词检索合并后，最高 `hybridScore` < 0.5 的查询，**不进入 LLM 生成阶段**
- 直接返回拒绝话术
- 实现位置：`RAGService.orchestrate()` 开头

### Layer 2: System Prompt 强制约束（In-prompt）

- System Prompt 中明确写入"只能基于检索片段回答"
- 要求 LLM 标注来源
- Temperature = 0.3（低温度，保证事实性）
- 实现位置：`LLMService.generate()` 的 prompt 参数

### Layer 3: 回答后校验（Post-hoc）

```typescript
function validateAnswer(answer: string, chunks: MergedResult[]): boolean {
  // 简单规则：检查回答中是否包含文档片段外的具体数字/日期
  // 注意：RegExp 构造函数接受字符串，从已有的 RegExp source 创建新正则
  const numberPattern = /\d{4}年|\d+天|\d+%|\d+元/g;
  const answerNumbers = answer.match(numberPattern) || [];

  // 提取 chunk 中的所有数字
  const chunkText = chunks.map(c => c.content).join('');
  const chunkNumbers = chunkText.match(numberPattern) || [];

  // 如果回答中有数字不在 chunk 中，标记为疑似幻觉
  const suspicious = answerNumbers.some(n => !chunkNumbers.includes(n));

  return !suspicious;  // true = 通过校验
}
```

> ⚠️ 此层为简化实现，MVP 阶段使用。未来可升级为大模型自校验。

### Layer 4: 置信度标签（Transparency）

| 标签 | 条件 | 展示方式 |
|------|------|---------|
| 🟢 高置信度 | 最高 hybridScore > 0.8 | 绿色标签 |
| 🟡 中置信度 | 最高 hybridScore 0.5-0.8 | 黄色标签 |
| 🔴 低置信度/拒绝 | 最高 hybridScore < 0.5 | 红色标签，返回拒绝话术 |

---

## 7. RAGService 编排流程

```typescript
class RAGService {
  async orchestrate(
    query: string,
    conversationId: string
  ): Promise<AsyncIterable<StreamChunk>> {
    // Step 1: 检索
    const vectorResults = await this.vectorSearch(query, VECTOR_TOP_K);
    const keywordResults = this.keywordSearch(query, KEYWORD_TOP_K);
    const merged = mergeResults(vectorResults, keywordResults, MERGE_TOP_K);

    // Step 2: 阈值过滤（Layer 1）
    if (shouldReject(merged, query)) {
      return this.generateRejection();
    }

    // Step 3: 获取对话历史
    const history = await this.chatService.getHistory(conversationId);

    // Step 4: 组装 Prompt
    const { formattedHistory, formattedChunks } = this.buildPrompt(
      merged, history, query
    );

    // Step 5: 调用 LLM（Layer 2 在 LLMService 中）
    const stream = this.llmService.generate(formattedHistory, formattedChunks, query);

    // Step 6: 流式返回，结束时附加 sources（Layer 3 可在前端或后端做）
    return this.wrapStream(stream, merged);
  }
}
```

---

## 8. 验收标准

- [ ] 输入"年假怎么请"，返回 Top-3 文档片段，最高相似度 > 0.5
- [ ] 输入"公司食堂在哪里"，返回空结果，直接返回拒绝话术
- [ ] 输入"张三的工资是多少"，返回拒绝话术（查询他人隐私）
- [ ] 输入"我有多少天年假"，基于 UserProfile 数据回答（查询自己数据）
- [ ] 混合检索权重正确：向量 0.4 + 关键词 0.6
- [ ] 多轮对话能正确承接上下文
- [ ] System Prompt 严格约束 LLM 基于检索片段回答
- [ ] 每个回答标注来源文档名称
- [ ] 置信度标签正确显示（高/中/低）
- [ ] 上下文超长时优先压缩历史，保留检索片段

---

## 9. 与其他模块的关系

```
RAGService
    ├── 依赖 EmbeddingService（问题向量化）
    ├── 依赖 VectorStore（向量检索）
    ├── 依赖 LLMService（生成回答）
    ├── 依赖 ChatService（获取对话历史）
    └── 被 AskController 调用
```

---

## 10. Spec 演进记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-18 | v1.0 | 初始版本，从 AI-SPEC.md 和 phase-2 spec 中提取 RAG 规范 |

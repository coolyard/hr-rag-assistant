# 模块 Spec：LLM（大语言模型生成模块）

> 本模块定义 LLM 文本生成的规范，负责基于组装好的 Prompt 生成自然语言回答。流式输出是核心体验。
>
> 对应变更域：phase-1-infrastructure（客户端封装）+ phase-2-rag-engine（生成调用）

---

## 1. 范围边界

### 1.1 包含
- Ollama Generate API 调用封装
- 流式输出（SSE）生成
- Prompt 组装（与 RAGService 协作）
- 生成参数控制（temperature、top_p、max_tokens）
- 超时与错误处理

### 1.2 不包含
- ❌ Prompt 模板定义（见 rag-spec.md 和 AI-SPEC.md）
- ❌ RAG 检索逻辑（见 rag-spec.md）
- ❌ 对话历史管理（见 chat-spec.md）
- ❌ 其他 LLM 模型实现（扩展点）

---

## 2. 模型配置

| 参数 | 值 | 说明 |
|------|-----|------|
| `model` | `qwen2.5:7b-instruct` | Ollama 本地模型 |
| `temperature` | 0.3 | 低温度，保证事实性 |
| `top_p` | 0.9 | 核采样 |
| `top_k` | 40 | Top-K 采样 |
| `max_tokens` | 1024 | 单次回答最大 Token 数 |
| `stream` | `true` | 必须开启流式输出 |
| `ollama_base_url` | `http://localhost:11434` | Ollama 服务地址 |
| `timeout` | 60000 | 单次生成超时 60 秒 |
| `max_retries` | 2 | 失败重试次数 |

> ⚠️ **temperature 锁定为 0.3**：这是事实性回答的关键参数，变更需更新 Spec 并测试

---

## 3. 接口定义

### 3.1 ILLMService 接口

```typescript
interface ILLMService {
  /**
   * 流式生成回答
   * @param systemPrompt System Prompt 文本
   * @param history 格式化后的对话历史
   * @param retrievedChunks 格式化后的检索片段
   * @param userQuestion 当前用户问题
   * @returns 异步可迭代字符串流
   */
  generate(
    systemPrompt: string,
    history: string,
    retrievedChunks: string,
    userQuestion: string
  ): AsyncIterable<string>;

  /**
   * 检查 LLM 服务是否可用
   */
  healthCheck(): Promise<{ available: boolean; model: string }>;
}
```

### 3.2 Ollama API 调用规范

**请求**：
```http
POST http://localhost:11434/api/generate
Content-Type: application/json

{
  "model": "qwen2.5:7b-instruct",
  "prompt": "<组装后的完整 Prompt>",
  "stream": true,
  "options": {
    "temperature": 0.3,
    "top_p": 0.9,
    "top_k": 40,
    "num_predict": 1024
  }
}
```

**流式响应**：
```
{"model":"qwen2.5:7b-instruct","created_at":"2026-05-18T09:30:00Z","response":"根据","done":false}
{"model":"qwen2.5:7b-instruct","created_at":"2026-05-18T09:30:00Z","response":"《年假制度》","done":false}
{"model":"qwen2.5:7b-instruct","created_at":"2026-05-18T09:30:01Z","response":"，","done":false}
...
{"model":"qwen2.5:7b-instruct","created_at":"2026-05-18T09:30:05Z","response":"","done":true,"context":[...]}
```

---

## 4. Prompt 组装规范

### 4.1 完整 Prompt 结构

```
<System Prompt>

## 检索到的文档片段
<格式化后的 chunks>

## 对话历史
<格式化后的历史>

## 当前问题
<用户问题>

请基于以上文档片段回答问题。如果文档片段为空或无关，请直接返回拒绝话术。
```

### 4.2 组装示例

```
你是企业 HR 助手，专门回答员工关于公司制度、政策和流程的问题。

## 核心规则
1. 【知识边界】你只能基于以下检索到的 HR 文档片段回答问题...
...

## 检索到的文档片段
[片段 1] 来源：《年假制度》
分类：年假
内容：## 年假申请规则
- 年假需提前3天申请
- 年假申请需要直属上级审批
相关性：89.0%
---
[片段 2] 来源：《考勤制度》
...

## 对话历史
员工：年假怎么请？
助手：根据《年假制度》，年假需要提前3天申请...

## 当前问题
那病假呢？

请基于以上文档片段回答问题...
```

### 4.3 总长度控制

- 目标：完整 Prompt 不超过 3000 Token
- 策略：当超出时，优先压缩历史对话（见 rag-spec.md 截断策略）
- 硬性限制：超出 4000 Token 时，截断检索片段至 Top-1

---

## 5. 流式生成实现

### 5.1 NestJS SSE 封装

```typescript
@Controller('api')
export class AskController {
  @Post('ask')
  @UseGuards(AuthGuard)
  async ask(@Body() body: AskRequest, @Res() res: Response) {
    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.ragService.orchestrate(
      body.question,
      body.conversationId
    );

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ chunk: '', done: true, sources })}\n\n`);
    res.end();
  }
}
```

### 5.2 流式数据处理

```typescript
async function* parseOllamaStream(
  response: Response
): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.response !== undefined) {
          yield data.response;
        }
      } catch {
        // 忽略解析失败的行
      }
    }
  }
}
```

---

## 6. 错误处理

| 场景 | 处理策略 |
|------|---------|
| Ollama 未启动 | 重试 2 次后抛出 `OllamaConnectionError`，返回 503 |
| 模型未下载 | 抛出 `ModelNotFoundError`，提示 `ollama pull qwen2.5:7b-instruct` |
| 生成超时（>60s） | 中断流，SSE 发送 `{done: true, error: "生成超时"}` |
| 生成过程中 Ollama 断开 | 发送已生成内容 + error 包 |
| Token 超限 | Ollama 自动截断，返回 `done: true` |
| 空响应 | 返回 "抱歉，生成失败，请重试" |

---

## 7. 性能要求

| 指标 | 目标值 |
|------|--------|
| 流式首字延迟 | < 2 秒 |
| 完整回答时间（500字） | < 10 秒 |
| 单次最大生成 Token | 1024 |
| 并发请求建议 | ≤ 5 |

---

## 8. 验收标准

- [ ] 输入"你好"，返回中文回答（验证模型连通性）
- [ ] 输入"年假怎么请"，2 秒内出现第一个字
- [ ] 回答以流式方式逐字显示
- [ ] 生成参数正确：temperature=0.3，stream=true
- [ ] 完整 Prompt 包含 System Prompt + 检索片段 + 历史 + 问题
- [ ] Ollama 未启动时返回 503 错误
- [ ] 生成超时后前端显示友好提示
- [ ] 回答内容基于检索片段，不凭空编造

---

## 9. 与其他模块的关系

```
LLMService
    ├── 被 RAGService 依赖（生成回答）
    ├── 被 AskController 间接依赖（通过 RAGService）
    ├── 调用 Ollama /api/generate
    └── 独立模块，不依赖其他业务模块
```

---

## 10. Spec 演进记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-18 | v1.0 | 初始版本，从 AI-SPEC.md 和 phase-1/2 spec 中提取 LLM 规范 |

# 模块 Spec：API（后端接口规范模块）

> 本模块定义后端所有 REST API 和 SSE 接口的全局规范，是前后端契约的单一事实来源。
>
> 对应变更域：全局（跨所有 phase）

---

## 1. 范围边界

### 1.1 包含

- 所有 REST API 端点的路径、方法、请求体、响应体定义
- SSE 流式接口规范
- 全局错误响应格式
- 认证与授权规则
- 请求/响应头规范
- 接口版本策略

### 1.2 不包含

- ❌ 具体业务逻辑实现（由各 Service 模块负责）
- ❌ 数据库 Schema（本项目无数据库）
- ❌ 前端组件实现

---

## 2. 全局规范

### 2.1 基础路径

- **API 基础路径**：`/api`
- **版本**：v1（当前无版本前缀，所有接口视为 v1）
- **完整示例**：`http://localhost:3000/api/ask`

### 2.2 请求头规范

| Header          | 必填             | 说明                                                    |
| --------------- | ---------------- | ------------------------------------------------------- |
| `Content-Type`  | 是（POST/PUT）   | `application/json` 或 `multipart/form-data`             |
| `Authorization` | 是（受保护路由） | `Bearer <JWT_TOKEN>`                                    |
| `Accept`        | 否               | 默认 `application/json`，SSE 接口需 `text/event-stream` |

### 2.3 响应格式

**成功响应**：直接返回数据对象，无统一包装（保持 NestJS 默认）

**错误响应**：

```typescript
interface ApiError {
  statusCode: number; // HTTP 状态码
  message: string; // 错误描述
  error: string; // 错误类型
  code?: string; // 业务错误码（可选）
  timestamp?: string; // 错误时间 ISO 字符串
  path?: string; // 请求路径
}
```

**示例 400 Bad Request**：

```json
{
  "statusCode": 400,
  "message": "仅支持 .md 文件",
  "error": "Bad Request",
  "code": "INVALID_FILE_TYPE",
  "timestamp": "2026-05-18T09:30:00.000Z",
  "path": "/api/documents/upload"
}
```

### 2.4 HTTP 状态码规范

| 状态码 | 使用场景                             |
| ------ | ------------------------------------ |
| 200    | GET 请求成功、DELETE 成功            |
| 201    | POST 创建成功（当前项目少用）        |
| 400    | 请求参数错误、文件类型不符           |
| 401    | 未登录、Token 无效/过期              |
| 403    | 权限不足（如 employee 访问上传接口） |
| 404    | 资源不存在                           |
| 413    | 文件大小超过限制                     |
| 500    | 服务器内部错误                       |
| 503    | Ollama 服务未连接                    |

---

## 3. 接口清单

### 3.1 健康检查

#### GET /api/health

| 属性 | 值       |
| ---- | -------- |
| 认证 | 无需认证 |

**响应 200**：

```json
{
  "status": "ok",
  "timestamp": "2026-05-18T09:30:00.000Z",
  "service": "hr-rag-assistant-api",
  "version": "0.1.0"
}
```

#### GET /api/health/ollama

| 属性 | 值       |
| ---- | -------- |
| 认证 | 无需认证 |

**响应 200**：

```json
{
  "status": "ok",
  "models": ["qwen2.5:7b-instruct", "nomic-embed-text"],
  "ollamaVersion": "0.1.48"
}
```

**响应 503**：

```json
{
  "status": "error",
  "message": "Ollama 服务未连接"
}
```

---

### 3.2 认证接口

#### POST /api/auth/login

详见 [auth-spec.md](./auth-spec.md)

---

### 3.3 问答接口

#### POST /api/ask（SSE 流式）

详见 [chat-spec.md](./chat-spec.md)

---

### 3.4 对话历史接口

#### GET /api/conversations

| 属性 | 值         |
| ---- | ---------- |
| 认证 | Bearer JWT |

**响应 200**：

```json
{
  "conversations": [
    {
      "id": "conv-123456-abc",
      "title": "年假怎么请？",
      "createdAt": 1715900000000,
      "updatedAt": 1715900005000,
      "messageCount": 4
    }
  ]
}
```

> 按 `updatedAt` 降序排列，方便前端展示最近会话。

#### GET /api/ask/history/:conversationId

| 属性 | 值         |
| ---- | ---------- |
| 认证 | Bearer JWT |

**响应 200**：

```json
{
  "conversationId": "conv-123456-abc",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "年假怎么请？",
      "timestamp": 1715900000000
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "根据《年假制度》...",
      "timestamp": 1715900005000,
      "sources": [
        {
          "documentName": "年假制度.md",
          "documentTitle": "年假制度",
          "category": "annual_leave",
          "chunk": "年假需提前3天申请...",
          "similarity": 0.89
        }
      ]
    }
  ]
}
```

#### DELETE /api/ask/history/:conversationId

| 属性 | 值         |
| ---- | ---------- |
| 认证 | Bearer JWT |

**响应 200**：

```json
{
  "success": true,
  "conversationId": "conv-123456-abc"
}
```

---

### 3.5 文档接口

#### GET /api/documents

| 属性 | 值         |
| ---- | ---------- |
| 认证 | Bearer JWT |

**响应 200**：

```json
{
  "documents": [
    {
      "id": "doc-annual_leave",
      "filename": "年假制度.md",
      "title": "年假制度",
      "category": "annual_leave",
      "categoryName": "年假",
      "categoryColor": "#E3F2FD",
      "chunkCount": 7,
      "size": 1144,
      "createdAt": "2026-05-17T00:00:00.000Z",
      "updatedAt": "2026-05-17T00:00:00.000Z"
    }
  ],
  "total": 5
}
```

#### GET /api/documents/:id

| 属性 | 值                                   |
| ---- | ------------------------------------ |
| 认证 | Bearer JWT                           |
| 参数 | `id` — 文档标识（如 `annual_leave`） |

**响应 200**：

```json
{
  "id": "doc-annual_leave",
  "filename": "年假制度.md",
  "title": "年假制度",
  "category": "annual_leave",
  "categoryName": "年假",
  "content": "# 年假制度\n\n## 年假天数标准\n...",
  "size": 1144,
  "createdAt": "2026-05-17T00:00:00.000Z"
}
```

#### POST /api/documents/upload

| 属性         | 值                       |
| ------------ | ------------------------ |
| 认证         | Bearer JWT（仅 hr 角色） |
| Content-Type | `multipart/form-data`    |

**请求**：

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="新员工入职指南.md"
Content-Type: text/markdown

<文件内容>
------WebKitFormBoundary--
```

**约束**：

- 仅接受 `.md` 扩展名
- 单文件大小 ≤ 1MB（1,048,576 字节）
- 保存路径：`docs/hr-documents/`

**响应 200**：

```json
{
  "filename": "新员工入职指南.md",
  "chunks": 8,
  "status": "indexed",
  "message": "上传成功，已建立索引"
}
```

**响应 400**：

```json
{
  "statusCode": 400,
  "message": "仅支持 .md 文件",
  "error": "Bad Request",
  "code": "INVALID_FILE_TYPE"
}
```

**响应 413**：

```json
{
  "statusCode": 413,
  "message": "文件大小超过 1MB 限制",
  "error": "Payload Too Large",
  "code": "FILE_TOO_LARGE"
}
```

**响应 403**：

```json
{
  "statusCode": 403,
  "message": "权限不足",
  "error": "Forbidden",
  "code": "FORBIDDEN"
}
```

---

### 3.6 用户个人信息接口

#### GET /api/me

| 属性 | 值         |
| ---- | ---------- |
| 路径 | `/api/me`  |
| 方法 | GET        |
| 认证 | Bearer JWT |

**响应 200**：

```json
{
  "id": "user-1",
  "username": "employee",
  "role": "employee",
  "displayName": "员工",
  "profile": {
    "realName": "张小明",
    "department": "技术研发部",
    "position": "前端开发工程师",
    "level": "P5",
    "hireDate": "2024-03-15",
    "annualLeaveTotal": 5,
    "annualLeaveUsed": 2,
    "annualLeaveRemaining": 3,
    "sickLeaveUsed": 1,
    "personalLeaveUsed": 0,
    "reimbursementTotal": 3250,
    "reimbursementPending": 800,
    "reimbursementApproved": 2450,
    "communicationSubsidy": 200,
    "transportSubsidy": 500,
    "mealSubsidy": 660,
    "lateCountThisMonth": 1,
    "forgotClockCountThisMonth": 0,
    "overtimeBalanceHours": 16,
    "trainingBudgetRemaining": 3200,
    "annualExaminationStatus": "completed",
    "birthdayBenefitStatus": "claimed",
    "lastPromotionDate": null,
    "nextEvaluationEligible": true
  }
}
```

### 3.7 MCP 接口

#### POST /api/mcp/initialize

| 属性 | 值         |
| ---- | ---------- |
| 认证 | Bearer JWT |

**请求体**：

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "test-client",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

**响应**：

```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "hr-rag-assistant-mcp",
      "version": "0.1.0"
    }
  },
  "id": 1
}
```

#### POST /api/mcp/tools/list

**响应**：

```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "search_documents",
        "description": "搜索 HR 文档知识库",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" }
          }
        }
      }
    ]
  },
  "id": 1
}
```

---

## 4. 接口依赖关系

```
/api/health          → 无依赖
/api/health/ollama   → Ollama 服务
/api/auth/login      → AuthService
/api/ask             → AuthGuard + RAGService + LLMService
/api/ask/history/*   → AuthGuard + ChatService
/api/conversations     → AuthGuard + ChatService
/api/documents       → AuthGuard + DocumentService
/api/documents/:id   → AuthGuard + DocumentService
/api/documents/upload → AuthGuard + RolesGuard + DocumentUploadService
/api/mcp/*           → AuthGuard + MCPService
```

---

## 5. 前后端模块映射

| 前端模块                  | 调用接口                          | 对应后端模块               |
| ------------------------- | --------------------------------- | -------------------------- |
| LoginPage.tsx             | `POST /api/auth/login`            | AuthModule                 |
| AuthContext.tsx           | `localStorage` 存储 Token         | —                          |
| ChatPage.tsx              | `GET /api/conversations`          | ChatService                |
| ChatPage.tsx + useChat.ts | `POST /api/ask` (SSE)             | AskController + RAGService |
| ChatPage.tsx              | `GET/DELETE /api/ask/history/:id` | ChatService                |
| DocumentPage.tsx          | `GET /api/documents`              | DocumentController         |
| DocumentViewer.tsx        | `GET /api/documents/:id`          | DocumentController         |
| DocumentUploader.tsx      | `POST /api/documents/upload`      | DocumentController         |
| ConnectionStatus.tsx      | `GET /api/health/ollama`          | HealthController           |

---

## 6. 验收标准

- [ ] 所有接口响应格式符合本规范定义
- [ ] 401 响应触发前端自动跳转登录页
- [ ] 403 响应显示"权限不足"提示
- [ ] 400/413 响应前端显示对应友好提示
- [ ] 500 响应被全局 ExceptionFilter 捕获，不暴露堆栈
- [ ] SSE 接口正确设置 `Content-Type: text/event-stream`
- [ ] CORS 配置允许前端域名访问

---

## 7. Spec 演进记录

| 日期       | 版本 | 变更内容                                                  |
| ---------- | ---- | --------------------------------------------------------- |
| 2026-05-18 | v1.0 | 初始版本，从 ARCHITECTURE.md 中提取所有接口定义，统一格式 |

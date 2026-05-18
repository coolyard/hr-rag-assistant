# Phase 4 Tasks — 协议扩展

## Task Execution Order

```
Phase 1 + Phase 2 + Phase 3 (全部完成)
    │
    ├── Task-010 (MCP 协议) ── 依赖 Phase 2 (RAG 检索能力)
    │
    └── Task-011 (热门问题 + 连接状态) ── 依赖 Phase 3 (Chat UI + Health API)
```

> Task-010 和 Task-011 相互独立，可并行执行。Phase 4 为可选扩展，不影响核心功能。

---

## Task-010: MCP 协议支持
- **目标**：实现基础 MCP Server 能力，暴露知识库工具
- **输入**：PRD.md MCP 功能、ARCHITECTURE.md MCPModule
- **输出**：
  - `apps/api/src/mcp/mcp-server.service.ts`
  - `apps/api/src/mcp/tool-registry.service.ts`
  - `apps/api/src/mcp/mcp.controller.ts`
- **验收标准**：
  - [ ] 支持 `initialize` 请求，返回 ServerInfo
  - [ ] 支持 `tools/list`，返回 3 个工具定义
  - [ ] 支持 `tools/call`，调用 search_documents 返回检索结果
- **预计耗时**：3-4 小时

## Task-011: 热门问题推荐 + 连接状态检测
- **目标**：首页展示快捷问题，检测 Ollama 连接状态
- **输入**：PRD.md 热门问题、连接状态
- **输出**：
  - `apps/web/src/components/Chat/SuggestedQuestions.tsx`
  - `apps/web/src/components/Layout/ConnectionStatus.tsx`
  - `apps/api/src/health/health.controller.ts`
- **验收标准**：
  - [ ] 首页展示 5-8 个热门问题
  - [ ] 点击快捷问题直接发送
  - [ ] Ollama 未启动时，顶部显示红色警告
- **预计耗时**：2 小时

# 变更域：协议扩展（phase-4-extension）

> 本变更域为可选扩展能力，不影响核心功能，可独立交付。
> 范围：MCP 协议支持、热门问题推荐、连接状态检测。

---

## 1. 范围边界

### 包含

- MCP Server 基础实现（initialize、tools/list、tools/call）
- 热门问题推荐（首页快捷入口）
- Ollama 连接状态检测与提示

### 不包含

- RAG 核心算法（phase-2）
- 用户界面主体（phase-3）
- 文档索引（phase-1）

---

## 2. 依赖的前置域

- phase-1-infrastructure（项目结构、Ollama 连通）
- phase-2-rag-engine（检索服务、LLM 服务）
- phase-3-user-experience（Chat 页面用于展示热门问题）

---

## 3. 验收标准

- [ ] 支持 `initialize` 请求，返回 ServerInfo
- [ ] 支持 `tools/list`，返回 3 个工具定义
- [ ] 支持 `tools/call`，调用 search_documents 返回检索结果
- [ ] 首页展示 5-8 个热门问题（如"年假怎么请"、"报销流程是什么"）
- [ ] 点击快捷问题直接发送
- [ ] Ollama 未启动时，顶部显示红色警告"本地模型服务未连接"

---

## 4. 技术决策

- MCP 协议使用 JSON-RPC 2.0 格式
- 热门问题预置在配置文件中，不依赖后端动态生成
- 连接状态通过轮询 `/api/health/ollama` 检测

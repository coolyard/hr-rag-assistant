# 变更域：用户交互体验（phase-3-user-experience）

> 本变更域面向最终用户，包含所有用户直接感知的功能。
> 范围：Theme 切换、登录系统、Chat UI、文档浏览 + 上传页面。

---

## 1. 范围边界

### 包含
- Theme 系统（light/dark/system）
- Fake 登录系统（JWT + 角色）
- Chat 页面（消息列表、输入框、热门问题推荐）
- 文档浏览页面（列表、分类筛选、详情）
- 文档上传功能（仅接受 .md 文件，上传后自动解析并重建索引）

### 不包含
- RAG 核心算法（phase-2）
- MCP 协议（phase-4）
- 文档索引重建的底层逻辑（phase-1 已提供，phase-3 调用接口）

---

## 2. 依赖的前置域
- phase-1-infrastructure（项目结构、Ollama 连通、内置文档索引）
- phase-2-rag-engine（SSE 流式 API、对话历史接口）

---

## 3. 验收标准
- [ ] 打开系统，看到登录页（Theme 跟随系统偏好）
- [ ] 输入预置账号登录成功，JWT Token 存储到 LocalStorage
- [ ] 未登录访问 /chat 自动跳转 /login
- [ ] 进入 Chat 页，看到热门问题推荐
- [ ] Theme 切换即时生效，刷新保持
- [ ] system 模式跟随操作系统偏好
- [ ] 深色模式下文档阅读区对比度舒适
- [ ] 文档列表展示 5 个内置文档卡片，带分类色块
- [ ] 点击卡片查看完整 Markdown 内容
- [ ] 支持按分类筛选（年假/报销/考勤/晋升/福利）
- [ ] 点击"上传文档"按钮，选择 .md 文件，上传成功提示"已建立索引"
- [ ] 上传新文档后，立即可以针对该文档提问，回答基于新文档内容
- [ ] 上传非 .md 文件时，前端提示"仅支持 Markdown 文件"

---

## 4. 技术决策
- 登录用 JWT，内存用户表，LocalStorage 持久化 Token
- Theme 用 CSS Variables，三种模式（light/dark/system）
- Chat 消息气泡：用户蓝色右对齐，助手白色左对齐
- 分类色卡：年假=浅蓝，报销=浅绿，晋升=浅橙，考勤=浅紫，福利=浅黄
- 文档上传使用 Axios + FormData，后端使用 Multer 接收
- 上传成功后，前端自动刷新文档列表
- 上传的文档保存到 `docs/hr-documents/`

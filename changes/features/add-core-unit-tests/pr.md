## 变更描述

为项目后端和前端添加核心单元测试，覆盖 RAG 编排、向量检索、关键词匹配、幻觉检测、认证逻辑等核心服务层模块，以及 ChatMessage、useChat、DocumentCard 等关键前端组件和工具函数。同时配置 Jest / Vitest 测试框架、CI 流程，确保 `pnpm test` 作为门禁。

## 关联 Task

- **Task-TS-01**: 搭建后端测试基础设施（Jest + @nestjs/testing + jest.config.ts）
- **Task-TS-02**: 实现后端核心模块单元测试（RAGService / VectorStore / KeywordSearch / Auth / Chat / UserProfile）
- **Task-TS-03**: 搭建前端测试基础设施（Vitest + @testing-library/react + vitest.config.ts）
- **Task-TS-04**: 实现前端核心模块单元测试（ChatMessage / DocumentCard / useChat / markdown）
- **Task-TS-05**: 配置根目录 scripts + CI 集成（pnpm test + .github/workflows/ci.yml）

## 验收标准

### 后端

- [ ] `pnpm --filter api test` 成功运行，Jest 发现并执行所有 `.spec.ts` 文件
- [ ] `pnpm --filter api test:coverage` 显示覆盖率报告，核心模块 > 80%
- [ ] RAGService P0 测试覆盖：mergeResults、shouldReject、getConfidenceLevel、buildPrompt
- [ ] RAGValidator 幻觉检测测试：验证数字匹配逻辑（100% 行覆盖率）
- [ ] VectorStoreService 向量运算测试：cosineSimilarity、add/search/clear、维度校验
- [ ] KeywordSearchService 关键词匹配测试：词频、标题加分、边界条件
- [ ] AuthService 认证测试：用户凭证验证、JWT 签发/验证、异常处理
- [ ] ChatService 对话管理测试：会话 CRUD、历史管理
- [ ] UserProfileService 个人数据测试：isPersonalQuery 判断、profile 获取

### 前端

- [ ] `pnpm --filter web test` 成功运行，Vitest 发现并执行所有 `.test.tsx` 文件
- [ ] ChatMessage 组件测试：用户气泡、加载态、流式态、完成态、Error 态
- [ ] ConfidenceBadge 组件测试：三色标签渲染
- [ ] HallucinationWarning 组件测试：警告文案渲染
- [ ] DocumentCard 组件测试：分类色映射、点击交互、键盘事件
- [ ] DocumentUploader 组件测试：按钮渲染
- [ ] useChat hook 测试：消息状态机、输入管理、会话清理
- [ ] renderMarkdown 工具函数测试：加粗/列表/代码渲染、XSS 转义

### CI

- [ ] `.github/workflows/ci.yml` 包含 lint / format:check / test 三步
- [ ] `pnpm test` 根目录可同时触发两端测试

## Spec 变更

- 新增：`changes/features/add-core-unit-tests/spec.md`（Feature Spec）
- 新增：`changes/features/add-core-unit-tests/instruction.md`（Agent 执行指令）

## 测试方式

1. `pnpm install` — 安装 @nestjs/testing、vitest 等新增依赖
2. `pnpm --filter api test` — 验证后端 7 个 spec 文件全部通过
3. `pnpm --filter web test` — 验证前端 7 个 test 文件全部通过
4. `pnpm lint` — 确保代码风格无回归
5. `pnpm test` — 根目录同时触发两端测试

## 审查重点

- VectorStore 的 cosineSimilarity 实现中，零向量除零保护是否覆盖到
- RAGValidator 的数字正则是否覆盖所有量词模式（年/天/%/元/小时/次）
- useChat hook 测试中 SSE mock 是否正确模拟了流式事件
- ChatMessage 测试中 sources 和 followUps 的条件渲染是否完整
- Mock 是否正确：所有外部依赖（Ollama、JWT）均使用 mock，不触发真实调用

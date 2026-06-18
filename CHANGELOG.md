# Changelog

## [1.3.0](https://github.com/coolyard/hr-rag-assistant/compare/v1.2.0...v1.3.0) (2026-06-18)


### Features

* add Evaluation Loop with RAG quality assessment dashboard ([27f8a4e](https://github.com/coolyard/hr-rag-assistant/commit/27f8a4ecb0bb10932c681cd6df5f0ee46d1f255e))
* add Evaluation Loop with RAG quality assessment dashboard ([f07c07d](https://github.com/coolyard/hr-rag-assistant/commit/f07c07dcae07ef29eac2bb9c78dd0da89eb081bc))
* add evaluation nav link for HR users ([b8e5fb0](https://github.com/coolyard/hr-rag-assistant/commit/b8e5fb01829d0bf7f16545987873d7b723cbbd68))
* add progress bar and background processing for evaluation ([379cf2f](https://github.com/coolyard/hr-rag-assistant/commit/379cf2fa312a1dc65e110250dd1aeaffea6b34e6))
* add project-conventions Codex Skill (617 lines, 8 dimensions) ([a825959](https://github.com/coolyard/hr-rag-assistant/commit/a825959be88dd3c40feff2a56d55beda3a8d9115))
* add project-conventions Codex Skill (617 lines, 8 dimensions) ([69a344b](https://github.com/coolyard/hr-rag-assistant/commit/69a344b108b256fbe364e9eb26bd75a05194a43b))
* add title hover to show full passage text in retrieval chart ([71508ca](https://github.com/coolyard/hr-rag-assistant/commit/71508ca4394bd618d4463f7d92dbd9954f9bb48f))
* **chat:** add advanced streaming UX — stop, regenerate, token counting ([24443a1](https://github.com/coolyard/hr-rag-assistant/commit/24443a1f708bc7c6c68eea04b575fed70b8aa937))
* **chat:** add advanced streaming UX — stop, regenerate, token counting ([b515701](https://github.com/coolyard/hr-rag-assistant/commit/b515701facf9711f5b909e951ea37f66a2f78ddc))
* **chat:** add AI thinking process display in Chat ([40da21f](https://github.com/coolyard/hr-rag-assistant/commit/40da21fb1cc38779cbbda145377cd826efcb9ab3))
* **chat:** add AI thinking process display in Chat messages ([a953165](https://github.com/coolyard/hr-rag-assistant/commit/a95316589d01e7663949a641c9cad7b5d958cef0))
* **chat:** add conversation persistence with Prisma SQLite and sidebar ([ab0a726](https://github.com/coolyard/hr-rag-assistant/commit/ab0a726d2555ffabc09042bb4f4d1315e792e8de))
* **chat:** add conversation persistence with Prisma SQLite and sidebar ([c0722e1](https://github.com/coolyard/hr-rag-assistant/commit/c0722e187259887efbaf68245a1e6d0b55d7f939))
* **chat:** add RAG retrieval visualization panel ([11abc6e](https://github.com/coolyard/hr-rag-assistant/commit/11abc6e4cff77d6aae079f70053b6cc2394b7da6))
* **chat:** add RAG retrieval visualization panel ([e8dd0cf](https://github.com/coolyard/hr-rag-assistant/commit/e8dd0cfffb65d5dd59340ce1a95c25013a1e2c67))
* **chat:** add thinking process display in AI chat ([ed47d4a](https://github.com/coolyard/hr-rag-assistant/commit/ed47d4a38e92877cd0e3a4468246fa6d0e5c94f0))
* **chat:** add Tool Use / Function Calling visualization ([fe19707](https://github.com/coolyard/hr-rag-assistant/commit/fe19707f71d190b484dc340fd08c84b8d8c01d98))
* **chat:** add Tool Use / Function Calling visualization ([1418a63](https://github.com/coolyard/hr-rag-assistant/commit/1418a6301208df755a2df262cb9577623b52cb77))
* **chat:** auto-select first conversation after page refresh ([f826406](https://github.com/coolyard/hr-rag-assistant/commit/f8264060803e072eec34d87ccf39b1f79eb0142f))
* **conversation:** persist conversations to SQLite with Prisma and add sidebar UI ([10b8a13](https://github.com/coolyard/hr-rag-assistant/commit/10b8a134f9b226ea13b4c962639ae615536787ee))
* **e2e:** add Playwright E2E tests covering 6 core user flows ([af680ed](https://github.com/coolyard/hr-rag-assistant/commit/af680ed58eb4aac7dd88a9c3e37a634f8cbbc830))
* **e2e:** add Playwright E2E tests for core user flows ([f46f316](https://github.com/coolyard/hr-rag-assistant/commit/f46f316348907c6ab648c599a1ca0fb3dfc4df44))
* **tests:** add core unit tests for backend and frontend ([f7490f7](https://github.com/coolyard/hr-rag-assistant/commit/f7490f76266353e0c2526a1fdee49e552d93e079))
* **tests:** add core unit tests with Jest + Vitest ([801eaad](https://github.com/coolyard/hr-rag-assistant/commit/801eaadd90f1d1463a21655a914402e1d1751bfd))
* **ui:** add mobile responsive sidebar with hamburger toggle ([396f4f9](https://github.com/coolyard/hr-rag-assistant/commit/396f4f921be868eda920dd594b80dc368f4afe84))
* **web:** add Playwright E2E tests covering 6 core user flows ([6026b9c](https://github.com/coolyard/hr-rag-assistant/commit/6026b9cede62d5bcc32ab33d2dce73aeddf3676d))
* **web:** add React production patterns — Error Boundary, lazy loading, copy button ([dadf45f](https://github.com/coolyard/hr-rag-assistant/commit/dadf45f9f209ca54351d3b58fa65a7a2151bec11))
* **web:** React production patterns — Error Boundary, lazy loading, copy button ([9bea98f](https://github.com/coolyard/hr-rag-assistant/commit/9bea98fd58131517f999375783015faa4118efed))


### Bug Fixes

* add LLMModule and PrismaModule to EvalModule imports ([e806ac6](https://github.com/coolyard/hr-rag-assistant/commit/e806ac64828cd7d9dc3a4fbf6c89365537ad0a4a))
* **api:** add ConversationStoreService to ConversationModule providers ([91bd4f3](https://github.com/coolyard/hr-rag-assistant/commit/91bd4f313b0408d73fc9425efe6dccfaf9e1b903))
* **api:** add ToolModule to AskModule imports ([e926264](https://github.com/coolyard/hr-rag-assistant/commit/e9262640cccbda7a76014f9af4fd6c2099de2af8))
* **api:** pass toolCallStart/toolResult through SSE controller ([7f291d8](https://github.com/coolyard/hr-rag-assistant/commit/7f291d8f52347e6b4278b614eb607c388e2d894b))
* **chat:** auto-set conversation title from first user message ([6e0f63c](https://github.com/coolyard/hr-rag-assistant/commit/6e0f63cbf5f42aaf40352cec7f798135570d94f8))
* **chat:** fix tool execute URL and ToolCallCard status handling ([7f92ff9](https://github.com/coolyard/hr-rag-assistant/commit/7f92ff950bc77cf05a7e6b419eefaed0ae91db63))
* **chat:** pass userId when creating conversation from chat messages ([d65b1b6](https://github.com/coolyard/hr-rag-assistant/commit/d65b1b699e9325cc747d0fadab7bb3bcb6c6dae6))
* **chat:** refresh sidebar conversation list after sending message ([a72d50b](https://github.com/coolyard/hr-rag-assistant/commit/a72d50b0d080640f3a2a4a39be8e6d55341a5b89))
* **chat:** remove loading assistant message on toolCallStart ([edab44b](https://github.com/coolyard/hr-rag-assistant/commit/edab44b7130fba54fd503103b601cc64cba1fc8a))
* **chat:** reuse frontend conversationId in backend to prevent ID mismatch ([3e2877c](https://github.com/coolyard/hr-rag-assistant/commit/3e2877c5ec5616a260d1ac27dc5f386cba432bf7))
* **chat:** show stopped hint instead of loading dots after user stops generation ([bff9581](https://github.com/coolyard/hr-rag-assistant/commit/bff95819c9f4e9219347214a5056b6f57cb25f7f))
* **chat:** wait for sendMessage to complete before refreshing sidebar ([ad13c0a](https://github.com/coolyard/hr-rag-assistant/commit/ad13c0a26550b40b09796d8e433d0d371b1e6c68))
* **ci:** add prisma generate before pnpm test ([2b843bb](https://github.com/coolyard/hr-rag-assistant/commit/2b843bbf7618b529623cf2778477ccfeb66f28e0))
* **ci:** create local main ref for git log comparison ([a3f1f17](https://github.com/coolyard/hr-rag-assistant/commit/a3f1f1795e7cda8f7e385bba5caf02abc7849f7b))
* **ci:** list merged PRs instead of raw commits in release PR body ([cff3b41](https://github.com/coolyard/hr-rag-assistant/commit/cff3b4140efcc3a1be356d76069eb80fcdc30646))
* **ci:** move prisma generate before lint; clean up stale tool-use types ([60b5bff](https://github.com/coolyard/hr-rag-assistant/commit/60b5bff854a257bc8d79189cf46c393facf29a17))
* **ci:** remove cron, fix PR body with clean variable interpolation ([18ec57f](https://github.com/coolyard/hr-rag-assistant/commit/18ec57f45cf0d694239a11ec81167194d2d31835))
* **ci:** specify pnpm version 10.33.4 in action-setup ([e617a76](https://github.com/coolyard/hr-rag-assistant/commit/e617a769c9a5e3c4206b36fde63b83bc1eecf388))
* **ci:** structured PR body with feat/fix/all categories and --body-file ([afe4402](https://github.com/coolyard/hr-rag-assistant/commit/afe4402c9589b182526ce03db9bd2b95ff8ddb16))
* **ci:** use local develop ref and handle empty commits in release-pr workflow ([4c3ddfd](https://github.com/coolyard/hr-rag-assistant/commit/4c3ddfd5a47cbb698aa6ce4e2a7cf50009b50b5c))
* **e2e:** insert retrieval button in ChatMessage messageActions ([a5e2a03](https://github.com/coolyard/hr-rag-assistant/commit/a5e2a037168f5a101ae8ac7fa70601b1e9ee31dc))
* **e2e:** resolve strict mode violation in profile spec ([b6618bd](https://github.com/coolyard/hr-rag-assistant/commit/b6618bd9efa0222420992113c5c1d1ed12db5994))
* **e2e:** resolve strict mode violations in retrieval tests ([ff9e6a5](https://github.com/coolyard/hr-rag-assistant/commit/ff9e6a5acfb57e903cea521fe3203204e4693739))
* hide retrieval detail button for historical conversations ([21159ec](https://github.com/coolyard/hr-rag-assistant/commit/21159ec09953f5c4217b3c6b2ceb6fe713ddb8eb))
* import RagModule in EvalModule to resolve RAGService dependency ([ea7b180](https://github.com/coolyard/hr-rag-assistant/commit/ea7b180530938aa22f37376e884860b9f3ae258e))
* lightweight polling endpoint and prioritize running run for progress bar ([35e5c03](https://github.com/coolyard/hr-rag-assistant/commit/35e5c03beac0675a06a2639ee13d167a1cb3c14f))
* **lint:** eslint-disable unsafe-* rules for Prisma-generated types ([efc5f39](https://github.com/coolyard/hr-rag-assistant/commit/efc5f39d5487e9c586c84b922d1b038022518774))
* **lint:** remove all eslint-disable directives, fix issues properly ([b09e46a](https://github.com/coolyard/hr-rag-assistant/commit/b09e46abc57e6425d001a259028840aa22817e95))
* **lint:** remove unnecessary nullish coalescing in conversation controller ([2dc8f09](https://github.com/coolyard/hr-rag-assistant/commit/2dc8f09eb67ab68c05f7851ebb181abe5f232548))
* **lint:** resolve misused-promises warning with void wrapper and remove unused handleToolConfirm ([c583295](https://github.com/coolyard/hr-rag-assistant/commit/c5832954ed799230c7bf6749e9e1b7cecd25b4ad))
* persist retrievalDetail in conversation history ([22a6121](https://github.com/coolyard/hr-rag-assistant/commit/22a6121a99c921e56d943574168433a0437c1129))
* remove retrievalDetail guard from sourcesSection ([2f1b2fd](https://github.com/coolyard/hr-rag-assistant/commit/2f1b2fd1c297cad1d59f768c3060f98b81bfd11d))
* replace Recharts with CSS bar chart to fix CI rendering ([0e7717d](https://github.com/coolyard/hr-rag-assistant/commit/0e7717df94a5bd4cb9655f6225217056386bd981))
* resolve all CI failures - lint, format, E2E 32/32 passed ([75f0b1c](https://github.com/coolyard/hr-rag-assistant/commit/75f0b1ccf07cac3798e6a819383841a5523e548e))
* resolve CI lint and E2E test failures ([f909511](https://github.com/coolyard/hr-rag-assistant/commit/f909511d4571531fe2f57239b2674850f619a0ad))
* show retrieval source comparison and process; use passage names in chart ([4783c8f](https://github.com/coolyard/hr-rag-assistant/commit/4783c8fac5580402f34769e65e40ac889ca0d6b5))
* show sidebar only on /chat page, not on other pages ([296e375](https://github.com/coolyard/hr-rag-assistant/commit/296e37525a53ebfdf23e7314373d48603e134690))
* **tests:** resolve chat.service.spec.ts Prisma mock returning incomplete data ([892b7ad](https://github.com/coolyard/hr-rag-assistant/commit/892b7add068bb27d954b12e793a6f298ad9496aa))
* **tool:** narrow apply_leave triggers to prevent false positives ([f0802f7](https://github.com/coolyard/hr-rag-assistant/commit/f0802f795d6bd95f2c94eba1bd31b8a0b06a49cb))
* **ui:** clean rewrite of App.tsx with mobile sidebar support ([65d379b](https://github.com/coolyard/hr-rag-assistant/commit/65d379b0197f7a2171f921a0a7aeb7280d7c00e3))
* **ui:** mobile sidebar with left positioning, simpler structure ([ce0f514](https://github.com/coolyard/hr-rag-assistant/commit/ce0f514aafa6af08e5b050851861a23a63b33102))
* **ui:** truncate long conversation titles with ellipsis and fix action menu clipping ([ac58bca](https://github.com/coolyard/hr-rag-assistant/commit/ac58bca5766b43669c25e74d8cb6bb378533bcb1))
* **ui:** use data-open attribute for mobile sidebar toggle ([a1c7d23](https://github.com/coolyard/hr-rag-assistant/commit/a1c7d239942c416547873a3360f0896ae8dec8aa))
* **ui:** use inline style for mobile sidebar toggle instead of CSS class ([f7eae34](https://github.com/coolyard/hr-rag-assistant/commit/f7eae34fc68065a1081b20de570f7b90a524441c))
* use cwd-based path for test-questions.json; add error handling to eval controller ([112124c](https://github.com/coolyard/hr-rag-assistant/commit/112124c80d9360274522bd9c632b73aed72dcdb4))
* widen radar chart SVG viewBox to prevent label truncation ([4c3ced0](https://github.com/coolyard/hr-rag-assistant/commit/4c3ced0337e5d87227154b82cbceb3145e1fe18e))

## [1.2.0](https://github.com/coolyard/hr-rag-assistant/compare/v1.1.0...v1.2.0) (2026-06-01)


### Features

* HR 智能助手 v1.2.0 — 餐补计算 + 请假日历 + 幻觉校验 + 信心徽章 ([c1f60ed](https://github.com/coolyard/hr-rag-assistant/commit/c1f60edb9cc8e10aa2f37fe20fe7fb377d7dc6d7))
* **meal-subsidy:** add leave calendar, monthly meal stats and yearly summary to Profile (Task-015) ([72d8624](https://github.com/coolyard/hr-rag-assistant/commit/72d8624fd7846499a0aadef3a5c14e51000ec7e7))
* **meal-subsidy:** add leave-records and meal-subsidy API endpoints (Task-013) ([0df9d62](https://github.com/coolyard/hr-rag-assistant/commit/0df9d62e606de9e74d11cb2cc3b168f03f9c43cf))
* **meal-subsidy:** extend RAG personal query detection and prompt injection (Task-014) ([8a4296f](https://github.com/coolyard/hr-rag-assistant/commit/8a4296f51348d411643449c51dbcd08a2f4883bd))
* **meal-subsidy:** extend UserProfile model with leave records and meal subsidy calculation (Task-012) ([0890bb7](https://github.com/coolyard/hr-rag-assistant/commit/0890bb7e318553d86e666457fb3ad1579bd1904a))
* **meal-subsidy:** implement meal subsidy calculation, leave calendar, and RAG personal query extensions ([6ad17f4](https://github.com/coolyard/hr-rag-assistant/commit/6ad17f490d5136d443f94fd0df367c26b60632b2))
* **meal-subsidy:** support multi-year subsidy and future month flags ([4909236](https://github.com/coolyard/hr-rag-assistant/commit/49092366aba6c30f13b0fbd0de025486e021f41e))
* **phase-2:** implement Layer 3 hallucination validation and Layer 4 confidence badges ([4f53620](https://github.com/coolyard/hr-rag-assistant/commit/4f536205b1e2dcd6650a891404344e43c39deaee))


### Bug Fixes

* **api:** add explicit string[] type annotations to prevent never[] inference ([e893d79](https://github.com/coolyard/hr-rag-assistant/commit/e893d79754f834b2254aaaa16bea9558b59d09e2))

## [1.1.0](https://github.com/coolyard/hr-rag-assistant/compare/v1.0.0...v1.1.0) (2026-05-21)


### Features

* **api:** add production deployment support ([4b7ff73](https://github.com/coolyard/hr-rag-assistant/commit/4b7ff73dac7b27495d4fa311d4d34a3e74eabf3e))
* mobile UX polish, production deployment, and demo-ready improvements ([1205742](https://github.com/coolyard/hr-rag-assistant/commit/1205742ec5df6ae4886d3727e13fe7c60965d70e))
* **navbar:** add responsive layout for mobile screens ([a448d41](https://github.com/coolyard/hr-rag-assistant/commit/a448d414935e2c2d114a96a1e226bf73830c13ee))
* **web:** add demo account hints and default credentials on login page ([b24d60d](https://github.com/coolyard/hr-rag-assistant/commit/b24d60d23439ec7dbf36a37445d1b15b447cec84))


### Bug Fixes

* **api:** correct Express middleware return patterns ([702d9dd](https://github.com/coolyard/hr-rag-assistant/commit/702d9dd1602cffcbd0d1a3070a350916c5c43370))

## 1.0.0 (2026-05-20)


### Features

* **auth:** add remember-me feature to persist login credentials ([1aa97f1](https://github.com/coolyard/hr-rag-assistant/commit/1aa97f1f314e4de9f59fe0b6b62e8702557deaf6))
* **chat:** add quick questions with preset HR prompts ([4e709c0](https://github.com/coolyard/hr-rag-assistant/commit/4e709c07873cfb3af15dec80eb45930316ba8c34))
* HR 智能助手 v1.0.0 — RAG 问答 + 文档中心 + 主题系统 ([01c760d](https://github.com/coolyard/hr-rag-assistant/commit/01c760d2afd5144affdda608875eefce2dc9c110))
* **phase-1:** complete infrastructure — monorepo, Ollama client, document pipeline ([0f57333](https://github.com/coolyard/hr-rag-assistant/commit/0f573337306dd76b4c8ca292706125648e8ff6a3))
* **phase-1:** configure Ollama client for LLM and Embedding (Task-002) ([6fe8487](https://github.com/coolyard/hr-rag-assistant/commit/6fe8487faf1efe34ed4820a076e1698d0f976217))
* **phase-1:** implement document loading, chunking and vector store (Task-003) ([9f8b696](https://github.com/coolyard/hr-rag-assistant/commit/9f8b69699be64bffa9c2f34e7190d9ce0d1c8bd6))
* **phase-1:** initialize NestJS + React project structure (Task-001) ([32d131b](https://github.com/coolyard/hr-rag-assistant/commit/32d131bf99ffaf27128bc7a085911a577be49280))
* **phase-2:** implement hybrid retrieval and RAG orchestration (Task-004) ([353877f](https://github.com/coolyard/hr-rag-assistant/commit/353877f36c55e769cdc5570ff70d1e0e10003344))
* **phase-2:** implement multi-turn conversation and LLM generation (Task-005) ([bf8d10d](https://github.com/coolyard/hr-rag-assistant/commit/bf8d10d1f83cf5c4c33bb430c3b694aaecfcceb4))
* **phase-2:** implement SSE streaming API and Chat frontend (Task-006) ([8ab7143](https://github.com/coolyard/hr-rag-assistant/commit/8ab7143c247526bf50d6695f3dba0bbfb241da0d))
* **phase-3:** implement document center with browse and upload (Task-009) ([d8f8301](https://github.com/coolyard/hr-rag-assistant/commit/d8f83018afb673214140ba5a74dc98caeaefc0d5))
* **phase-3:** implement JWT auth with role-based access (Task-008) ([fbbd026](https://github.com/coolyard/hr-rag-assistant/commit/fbbd026b0b186da0ba68210d74b64575d568a5eb))
* **phase-3:** implement Theme system with light/dark/system modes (Task-007) ([753de9a](https://github.com/coolyard/hr-rag-assistant/commit/753de9a8947723ef909a8929c328b8b1f5b9a5a2))
* **phase-3:** implement theme system, JWT auth, and document center ([7868d02](https://github.com/coolyard/hr-rag-assistant/commit/7868d024999bf80a807be5da03f0fec62b764da5))
* **rag:** add streaming status updates and follow-up question suggestions ([6079bb5](https://github.com/coolyard/hr-rag-assistant/commit/6079bb5dd11cc91ee08391f1754a4bec847571f3))
* **rag:** inject user profile data into RAG prompts for personal queries ([0cf76d5](https://github.com/coolyard/hr-rag-assistant/commit/0cf76d55cd50804d8bed863f71bb0c02ebc20745))
* **user-profile:** implement UserProfile module and Profile page ([a1b363d](https://github.com/coolyard/hr-rag-assistant/commit/a1b363db97d9857be6bae2f15fd2d358b06df24a))
* **user-profile:** implement UserProfile module and Profile page (Task-010) ([13ec5e0](https://github.com/coolyard/hr-rag-assistant/commit/13ec5e0f4f00c3b97ff9d366b343bee70bc7854d))


### Bug Fixes

* **ci:** remove invalid inputs from release-please action ([035122f](https://github.com/coolyard/hr-rag-assistant/commit/035122fce3997e7c2089c4a890e137d9577923d7))
* **vector:** correct cosine similarity to include magnitude normalization ([dbc2b9d](https://github.com/coolyard/hr-rag-assistant/commit/dbc2b9d355693fa8eeaf1de9154a3f2454977698))

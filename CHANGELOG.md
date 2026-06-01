# Changelog

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

# 模块 Spec：Auth（登录认证模块）

> 本模块定义登录认证的全链路规范，是系统的安全入口。所有受保护资源必须通过本模块鉴权。
>
> 对应变更域：phase-3-user-experience（前端 UI）+ phase-1-infrastructure（后端基础）

---

## 1. 范围边界

### 1.1 包含
- 后端：JWT 签发/验证/刷新、内存用户表、角色权限控制、AuthGuard
- 前端：登录页面、AuthContext（全局认证状态）、Token 持久化、自动跳转/拦截
- 接口：`POST /api/auth/login`、JWT 中间件保护

### 1.2 不包含
- ❌ 真实用户注册/密码找回/邮箱验证（PRD Out of Scope）
- ❌ 连接数据库（MySQL/PostgreSQL/MongoDB）
- ❌ OAuth / SSO / LDAP 集成（扩展点，当前不做）
- ❌ 密码加密（当前明文比对，MVP 阶段简化）

---

## 2. 数据模型

### 2.1 用户模型（内存预置）

```typescript
interface User {
  id: string;           // 唯一标识，如 "user-1"
  username: string;     // 登录账号
  password: string;     // 登录密码（当前明文）
  role: 'employee' | 'hr';  // 角色
  displayName: string;  // 显示名称
  profile: UserProfile; // 个人人事数据（见 user-profile-spec.md）
}
```

**预置用户表**（后端启动时加载到内存）：

| id | username | password | role | displayName |
|----|----------|----------|------|-------------|
| user-1 | employee | 123456 | employee | 员工 |
| user-2 | hr | 123456 | hr | HR专员 |

> 完整 `UserProfile` 定义见 [user-profile-spec.md](./user-profile-spec.md)。每个预置用户携带模拟个人数据，使"我有多少天年假"这类个人问题可回答。

### 2.2 JWT Payload

```typescript
interface UserPayload {
  sub: string;        // user id
  username: string;
  role: 'employee' | 'hr';
  iat: number;
  exp: number;
}
```

### 2.3 登录请求/响应

```typescript
// Request: POST /api/auth/login
interface LoginRequest {
  username: string;
  password: string;
}

// Response: 200 OK
interface LoginResponse {
  access_token: string;  // JWT Token
  user: {
    id: string;
    username: string;
    role: 'employee' | 'hr';
    displayName: string;
  };
}

// Response: 401 Unauthorized
interface LoginError {
  statusCode: number;   // 401
  message: string;      // 用户可读错误描述
  error: string;        // 错误类型
  code: string;         // 业务错误码
}
```

---

## 3. 后端接口规范

### 3.1 POST /api/auth/login

| 属性 | 值 |
|------|-----|
| 路径 | `/api/auth/login` |
| 方法 | POST |
| 认证 | 无需认证 |
| Content-Type | `application/json` |

**请求体**：
```json
{
  "username": "employee",
  "password": "123456"
}
```

**成功响应 200**：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-1",
    "username": "employee",
    "role": "employee",
    "displayName": "员工"
  }
}
```

**失败响应 401**：
```json
{
  "statusCode": 401,
  "message": "账号或密码错误",
  "error": "Unauthorized",
  "code": "INVALID_CREDENTIALS"
}
```

### 3.2 JWT 验证规则

- **密钥**：内存常量 `JWT_SECRET`（开发环境可用固定字符串，如 `'hr-rag-assistant-secret'`）
- **过期时间**：`expiresIn: '7d'`（7 天）
- **算法**：HS256
- **验证位置**：所有 `/api/*` 路由（除 `/api/auth/login`、`/api/health` 外）

### 3.3 AuthGuard 行为

```
请求到达受保护路由
    │
    ▼
提取 Header: Authorization: Bearer <token>
    │
    ▼
无 Token → 401 { "statusCode": 401, "message": "未登录", "error": "Unauthorized", "code": "MISSING_TOKEN" }
    │
    ▼
Token 无效/过期 → 401 { "statusCode": 401, "message": "登录已过期，请重新登录", "error": "Unauthorized", "code": "TOKEN_EXPIRED" }
    │
    ▼
Token 有效 → 将 user 注入 Request 对象 → 进入 Controller
```

### 3.4 角色控制（RolesGuard）

| 路由 | 允许角色 |
|------|---------|
| `/api/ask` | employee, hr |
| `/api/ask/history/*` | employee, hr |
| `/api/documents` | employee, hr |
| `/api/documents/:id` | employee, hr |
| `/api/documents/upload` | hr（仅 HR 可上传） |
| `/api/mcp/*` | employee, hr |

**无权限响应 403**：
```json
{
  "statusCode": 403,
  "message": "权限不足",
  "error": "Forbidden",
  "code": "FORBIDDEN"
}
```

---

## 4. 前端规范

### 4.1 AuthContext 接口

```typescript
interface AuthContextType {
  user: User | null;                    // 当前用户信息
  isAuthenticated: boolean;             // 是否已登录
  isLoading: boolean;                   // 初始化加载中
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### 4.2 Token 持久化

- **存储位置**：`localStorage` — `key: 'hr_rag_token'`
- **存储格式**：仅存储 JWT 字符串（`access_token`）
- **读取时机**：应用启动时（AuthContext 初始化）
- **清除时机**：
  - 用户点击"退出登录"
  - Token 过期（收到 401 响应）
  - 登录新账号（覆盖旧 Token）

### 4.3 路由守卫

| 路由 | 未登录状态 | 已登录状态 |
|------|-----------|-----------|
| `/` | 重定向到 `/login` | 重定向到 `/chat` |
| `/login` | 正常访问 | 自动跳转到 `/chat` |
| `/chat` | 自动跳转到 `/login` | 正常访问 |
| `/documents` | 自动跳转到 `/login` | 正常访问 |
| `/profile` | 自动跳转到 `/login` | 正常访问 |

### 4.4 全局导航栏（Navbar）

**位置**：所有受保护页面顶部固定

**内容**：
- 左侧：Logo + 应用名称"HR 智能助手"
- 中间：页面入口导航
  - 💬 对话（`/chat`）
  - 📚 文档（`/documents`）
  - 👤 我的（`/profile`）
- 右侧：
  - ThemeToggle 主题切换按钮
  - 用户菜单（下拉）：
    - 显示：`profile.realName`（如"张小明"）+ `level`（如"P5"）
    - 选项：个人主页（跳转 `/profile`）
    - 选项：退出登录

**导航状态**：
- 当前所在页面高亮显示
- 未读/新消息提示（扩展点，当前不做）

### 4.5 Axios 拦截器

**请求拦截器**：
```typescript
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('hr_rag_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**响应拦截器**：
```typescript
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hr_rag_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 5. UI 规范

### 5.1 登录页面（LoginPage）

- **布局**：居中卡片，宽度 400px，垂直水平居中
- **字段**：
  - 账号输入框（placeholder: "请输入账号"）
  - 密码输入框（type="password"，placeholder: "请输入密码"）
  - 登录按钮（主按钮样式）
- **交互**：
  - 输入框支持 Enter 键触发登录
  - 登录中按钮显示 loading 状态
  - 错误时输入框下方红色提示文字
- **默认聚焦**：账号输入框自动聚焦

### 5.2 登录后布局

- 顶部导航栏显示当前用户角色（"员工" 或 "HR专员"）
- 右上角显示退出登录按钮
- HR 角色额外显示"文档上传"入口

---

## 6. 错误处理

| 场景 | 前端行为 | 后端响应 |
|------|---------|---------|
| 账号不存在 | 提示"账号或密码错误" | 401 |
| 密码错误 | 提示"账号或密码错误" | 401 |
| Token 过期 | 自动跳转登录页，提示"登录已过期" | 401 |
| 无 Token 访问受保护路由 | 自动跳转登录页 | 401 |
| HR 专属功能被 employee 访问 | 提示"权限不足" | 403 |
| 网络异常 | 提示"网络异常，请稍后重试" | — |

---

## 7. 验收标准

- [ ] 使用 `employee / 123456` 登录成功，返回 JWT Token
- [ ] 使用 `hr / 123456` 登录成功，返回 JWT Token
- [ ] 错误密码登录，提示"账号或密码错误"，无 Token 返回
- [ ] 登录后 LocalStorage 中存在 `hr_rag_token`
- [ ] 未登录访问 `/chat` 自动跳转 `/login`
- [ ] 已登录访问 `/login` 自动跳转 `/chat`
- [ ] Token 过期后，前端自动清除 Token 并跳转登录页
- [ ] 所有 `/api/ask` 请求自动携带 `Authorization: Bearer <token>`
- [ ] employee 账号无法看到/使用文档上传功能
- [ ] hr 账号可以正常使用文档上传功能

---

## 8. 与其他模块的关系

```
AuthModule
    ├── 被 ChatModule 依赖（SSE 请求需 JWT）
    ├── 被 DocumentModule 依赖（上传需 HR 角色）
    ├── 被 AskController 依赖（问答需 JWT）
    ├── 提供 AuthContext 给所有前端页面
    └── 提供 UserProfile 给 RAGService（个人数据注入）
```

## 9. Spec 演进记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-18 | v1.0 | 初始版本，从 AI-SPEC + ARCHITECTURE 中提取 Auth 相关规范 |
| 2026-05-18 | v1.1 | 增加 `profile: UserProfile` 字段，支持个人数据查询 |

# 模块 Spec：UserProfile（用户个人数据模块）

> 本模块定义用户个人人事数据的模型、预置数据、以及将个人数据注入 RAG 对话的机制。使员工能够询问"我有多少天年假""我还剩多少报销额度"等与自身相关的问题。
>
> 对应变更域：phase-2-rag-engine（注入机制）+ phase-3-user-experience（个人数据展示）

---

## 1. 范围边界

### 1.1 包含

- 用户个人数据模型（UserProfile）定义
- 内存预置用户个人数据（基于 HR 制度文档生成模拟数据）
- 个人问题识别规则（判断用户是否在询问自身相关数据）
- 个人数据格式化与 Prompt 注入策略
- 个人数据与通用制度的融合回答机制

### 1.2 不包含

- ❌ 真实数据库连接（仍为内存预置）
- ❌ 个人隐私数据（工资、身份证号、家庭住址等敏感信息）
- ❌ 动态数据更新（如每日打卡、实时审批状态）
- ❌ 跨用户数据查询（用户 A 不能查询用户 B 的数据）

---

## 2. 数据模型

### 2.1 UserProfile

```typescript
interface UserProfile {
  // ── 基础信息 ──
  realName: string; // 真实姓名
  department: string; // 部门
  position: string; // 职位
  level: string; // 职级 P4/P5/P6/P7/M1/M2
  hireDate: string; // 入职日期（ISO 格式）
  probationEndDate: string; // 转正日期（ISO 格式）
  isProbation: boolean; // 是否在试用期

  // ── 年假 ──
  annualLeaveTotal: number; // 年假总天数（根据入职年限）
  annualLeaveUsed: number; // 已休年假天数（本年度）
  annualLeaveRemaining: number; // 剩余年假天数

  // ── 其他请假 ──
  sickLeaveUsed: number; // 已休病假天数（本年度）
  personalLeaveUsed: number; // 已休事假天数（本年度，累计≤10天）
  marriageLeaveUsed: number; // 已休婚假天数
  maternityLeaveUsed: number; // 已休产假天数

  // ── 报销 ──
  reimbursementTotal: number; // 本年度报销总额（元）
  reimbursementPending: number; // 待审批报销金额（元）
  reimbursementApproved: number; // 已审批到账金额（元）
  reimbursementCount: number; // 本年度报销次数

  // ── 补贴（已发放）──
  communicationSubsidy: number; // 通讯补贴：固定 200 元/月
  transportSubsidy: number; // 交通补贴：固定 500 元/月
  mealSubsidy: number; // 餐补：30 元/工作日

  // ── 考勤 ──
  lateCountThisMonth: number; // 本月迟到次数
  forgotClockCountThisMonth: number; // 本月忘打卡次数（允许2次补录）
  overtimeBalanceHours: number; // 加班调休余额（小时）

  // ── 福利 ──
  trainingBudgetRemaining: number; // 培训预算余额（年度 5000 元）
  annualExaminationStatus: 'completed' | 'scheduled' | 'not_yet'; // 体检状态
  birthdayBenefitStatus: 'claimed' | 'unclaimed'; // 生日福利

  // ── 晋升 ──
  lastPromotionDate: string | null; // 上次晋升日期
  nextEvaluationEligible: boolean; // 是否可参与下次晋升评估
}
```

### 2.2 预置用户个人数据

#### 用户 1：employee（普通员工，张小明）

模拟场景：入职 2 年，中级工程师，已转正，处于活跃工作状态。

```typescript
const employeeProfile: UserProfile = {
  realName: '张小明',
  department: '技术研发部',
  position: '前端开发工程师',
  level: 'P5',
  hireDate: '2024-03-15',
  probationEndDate: '2024-06-15',
  isProbation: false,

  annualLeaveTotal: 5,
  annualLeaveUsed: 2,
  annualLeaveRemaining: 3,

  sickLeaveUsed: 1,
  personalLeaveUsed: 0,
  marriageLeaveUsed: 0,
  maternityLeaveUsed: 0,

  reimbursementTotal: 3250,
  reimbursementPending: 800,
  reimbursementApproved: 2450,
  reimbursementCount: 4,

  communicationSubsidy: 200,
  transportSubsidy: 500,
  mealSubsidy: 660,

  lateCountThisMonth: 1,
  forgotClockCountThisMonth: 0,
  overtimeBalanceHours: 16,

  trainingBudgetRemaining: 3200,
  annualExaminationStatus: 'completed',
  birthdayBenefitStatus: 'claimed',

  lastPromotionDate: null,
  nextEvaluationEligible: true,
};
```

#### 用户 2：hr（HR 专员，李丽华）

模拟场景：入职 5 年，资深 HR，职级 P6，有管理经验。

```typescript
const hrProfile: UserProfile = {
  realName: '李丽华',
  department: '人力资源部',
  position: 'HRBP',
  level: 'P6',
  hireDate: '2021-01-10',
  probationEndDate: '2021-04-10',
  isProbation: false,

  annualLeaveTotal: 15,
  annualLeaveUsed: 5,
  annualLeaveRemaining: 10,

  sickLeaveUsed: 2,
  personalLeaveUsed: 1,
  marriageLeaveUsed: 0,
  maternityLeaveUsed: 0,

  reimbursementTotal: 1800,
  reimbursementPending: 0,
  reimbursementApproved: 1800,
  reimbursementCount: 2,

  communicationSubsidy: 200,
  transportSubsidy: 500,
  mealSubsidy: 660,

  lateCountThisMonth: 0,
  forgotClockCountThisMonth: 1,
  overtimeBalanceHours: 8,

  trainingBudgetRemaining: 1500,
  annualExaminationStatus: 'scheduled',
  birthdayBenefitStatus: 'unclaimed',

  lastPromotionDate: '2023-12-20',
  nextEvaluationEligible: true,
};
```

---

## 3. 个人问题识别

### 3.1 识别规则

当用户问题满足以下任一条件时，视为**个人数据查询**：

```typescript
function isPersonalQuery(query: string): boolean {
  const lower = query.toLowerCase();

  // 条件 1: 包含第一人称代词 + HR 相关关键词
  const firstPerson = /我|我的|本人/;
  const hrKeywords =
    /年假|假期|请假|报销|补贴|考勤|迟到|打卡|加班|调休|福利|体检|培训|晋升|职级|工资|薪资|事假|病假|婚假|产假/;

  if (firstPerson.test(lower) && hrKeywords.test(lower)) {
    return true;
  }

  // 条件 2: 询问"还剩多少""用了多少""有多少"等量化自身数据
  const quantityPatterns = /(?:我|我的).*?(?:还剩|还有|用了|已用|剩余|多少|几天|几小时|多少钱)/;
  if (quantityPatterns.test(lower)) {
    return true;
  }

  // 条件 3: 询问自身状态
  const statusPatterns = /(?:我|我的).*?(?:可以|能不能|是否符合|有没有资格|还能|是否可以)/;
  if (statusPatterns.test(lower)) {
    return true;
  }

  return false;
}
```

### 3.2 个人查询示例

| 问题类型 | 示例                                                           |
| -------- | -------------------------------------------------------------- |
| 年假余额 | "我还有多少天年假？" "我今年还能请几天假？"                    |
| 请假记录 | "我休过几天病假？" "我请过多少天事假？"                        |
| 报销状态 | "我有多少报销在审批中？" "我今年报销了多少钱？"                |
| 补贴情况 | "我的餐补是多少？" "通讯补贴发了吗？"                          |
| 考勤状态 | "我这个月迟到几次了？" "我还有几次忘打卡机会？"                |
| 加班调休 | "我有多少调休余额？" "我的加班时长还剩多少？"                  |
| 福利状态 | "我今年体检了吗？" "我的培训预算还剩多少？" "生日福利领了没？" |
| 晋升资格 | "我今年能参加晋升评估吗？" "我上次什么时候晋升的？"            |

### 3.3 非个人查询示例（仍走纯 RAG）

| 问题                   | 处理方式                       |
| ---------------------- | ------------------------------ |
| "年假怎么请？"         | 纯制度查询，只检索文档         |
| "病假需要什么证明？"   | 纯制度查询                     |
| "晋升后薪资涨多少？"   | 纯制度查询                     |
| "公司年假最多多少天？" | 纯制度查询（通用规则，非个人） |

---

## 4. 个人数据 Prompt 注入

### 4.1 格式化策略

当 `isPersonalQuery()` 返回 `true` 时，将当前登录用户的 `UserProfile` 格式化为文本块，插入到 System Prompt 中。

```typescript
function formatUserProfile(profile: UserProfile): string {
  return `## 当前用户个人信息
以下是你（${profile.realName}，${profile.department} ${profile.position}，职级 ${profile.level}）的当前人事数据：

### 年假与请假
- 年假总天数：${profile.annualLeaveTotal} 天
- 已休年假：${profile.annualLeaveUsed} 天
- 剩余年假：${profile.annualLeaveRemaining} 天
- 已休病假：${profile.sickLeaveUsed} 天
- 已休事假：${profile.personalLeaveUsed} 天（全年累计不超过 10 天）

### 报销与补贴
- 本年度报销总额：${profile.reimbursementTotal} 元
- 待审批报销：${profile.reimbursementPending} 元
- 已到账报销：${profile.reimbursementApproved} 元
- 通讯补贴：${profile.communicationSubsidy} 元/月
- 交通补贴：${profile.transportSubsidy} 元/月
- 工作日餐补：${profile.mealSubsidy} 元/月

### 考勤
- 本月迟到次数：${profile.lateCountThisMonth} 次（每月前 3 次免罚）
- 本月忘打卡次数：${profile.forgotClockCountThisMonth} 次（每月允许 2 次补录）
- 加班调休余额：${profile.overtimeBalanceHours} 小时

### 福利
- 培训预算余额：${profile.trainingBudgetRemaining} 元（年度 5000 元）
- 年度体检状态：${profile.annualExaminationStatus === 'completed' ? '已完成' : profile.annualExaminationStatus === 'scheduled' ? '已预约' : '未安排'}
- 生日福利：${profile.birthdayBenefitStatus === 'claimed' ? '已领取' : '未领取'}

### 晋升
- 上次晋升日期：${profile.lastPromotionDate ?? '无'}
- 是否可参加下次晋升评估：${profile.nextEvaluationEligible ? '是' : '否'}
`;
}
```

### 4.2 注入位置

个人数据块插入在**检索片段之后**，**对话历史之前**：

```
System Prompt（核心规则）

## 检索到的文档片段
{{retrieved_chunks}}

## 当前用户个人信息  ← 仅当 isPersonalQuery 为 true 时注入
{{user_profile}}

## 对话历史
{{conversation_history}}

## 当前问题
{{user_question}}
```

### 4.3 回答策略

当存在个人数据时，System Prompt 追加规则：

```
## 补充规则（个人数据相关）
6. 【个人数据优先】如果用户询问与自身相关的问题，优先基于上述"当前用户个人信息"回答。
7. 【制度补充】回答个人数据时，如果涉及制度规则（如"为什么我只有 5 天年假"），结合检索到的文档片段解释制度依据。
8. 【数据时效】个人数据为截至当前的状态，如有变动以 OA 系统为准。
```

---

## 5. 融合回答示例

### 示例 1：个人数据直接回答

**用户**："我还有多少天年假？"

**检索**：也检索到《年假制度》相关片段

**Prompt 注入**：包含张小明的 profile（剩余 3 天）

**AI 回答**：

> 你还有 **3 天**年假剩余。
>
> 你今年的年假总额是 5 天（根据《年假制度》，入职满 1 年享受 5 天年假），已休 2 天，所以剩余 3 天。年假不可跨年累计，建议在年底前安排休完。
>
> 📄 来源：《年假制度》，相似度 95%

### 示例 2：个人数据 + 制度解释

**用户**："我这个月还能迟到几次不扣钱？"

**Prompt 注入**：张小明本月已迟到 1 次

**AI 回答**：

> 你这个月已经迟到 1 次，根据《考勤制度》每月前 3 次免罚，所以你还**可以免罚迟到 2 次**。
>
> 从第 4 次开始，每次扣 50 元。如果每月累计超过 10 次，还会记警告一次。
>
> 📄 来源：《考勤制度》第 3 章，相似度 92%

### 示例 3：涉及隐私边界的拒绝

**用户**："我的工资是多少？"

**处理**：虽然 profile 中未包含工资数据，但用户询问工资属于敏感隐私。

**AI 回答**：

> 根据现有 HR 文档，无法确认该问题的答案。涉及具体薪资数字的问题，建议联系 HR 部门获取准确信息。

---

## 6. 隐私与安全约束

### 6.1 严格禁止回答的隐私问题

即使有个人数据注入，以下问题**必须拒绝**：

| 问题                         | 拒绝原因                       |
| ---------------------------- | ------------------------------ |
| "我的工资/月薪/年薪是多少？" | 具体薪资数字为高度敏感隐私     |
| "我的银行卡号是多少？"       | 金融信息                       |
| "我的身份证号是多少？"       | 身份敏感信息                   |
| "我的家庭住址是什么？"       | 个人隐私                       |
| "张三的工资是多少？"         | 跨用户查询，无论是否在职均拒绝 |
| "我和李四谁工资高？"         | 涉及他人隐私                   |

### 6.2 个人数据访问边界

- 用户只能查看自己的 profile，不能查看他人
- HR 角色也不能通过对话系统查看具体员工的个人数据（通用制度可以）
- 内存中的 profile 数据不包含真实敏感信息（工资、身份证、银行卡等）

---

## 7. 接口定义

### 7.1 UserProfileService 接口

```typescript
interface IUserProfileService {
  /**
   * 根据用户 ID 获取个人数据
   */
  getProfile(userId: string): UserProfile | null;

  /**
   * 判断查询是否为个人相关问题
   */
  isPersonalQuery(query: string): boolean;

  /**
   * 将个人数据格式化为 Prompt 文本
   */
  formatForPrompt(profile: UserProfile): string;

  /**
   * 获取所有预置用户（用于后端初始化）
   */
  getAllUsers(): User[];
}
```

### 7.2 API 扩展

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
    "annualLeaveRemaining": 3,
    "reimbursementPending": 800,
    "lateCountThisMonth": 1,
    ...
  }
}
```

> 前端可用此接口展示个人概览卡片，但对话中的个人数据由后端注入 Prompt，不依赖前端传递。

---

## 8. 前端 Profile 页面规范

### 8.1 页面路由

| 路由       | 权限                   | 说明               |
| ---------- | ---------------------- | ------------------ |
| `/profile` | employee, hr（需登录） | 用户个人信息展示页 |

### 8.2 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  顶部导航栏（Logo + 页面入口 + ThemeToggle + 用户菜单）        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  个人信息卡片                                         │   │
│  │  ┌──────┐                                           │   │
│  │  │ 头像 │  张小明  │  技术研发部                     │   │
│  │  │ 占位 │  P5 · 前端开发工程师                       │   │
│  │  └──────┘  入职：2024-03-15 · 已入职 1 年 2 个月     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │  年假统计卡片        │  │  报销统计卡片        │          │
│  │                     │  │                     │          │
│  │  ┌─────┐ ┌─────┐   │  │  ┌─────┐ ┌─────┐   │          │
│  │  │ 总  │ │ 已用│   │  │  │ 总额│ │ 待审│   │          │
│  │  │  5  │ │  2  │   │  │  │3250 │ │ 800 │   │          │
│  │  └─────┘ └─────┘   │  │  └─────┘ └─────┘   │          │
│  │  ┌─────────────┐   │  │  ┌─────────────┐   │          │
│  │  │ 剩余 3 天    │   │  │  │ 已到账 2450 │   │          │
│  │  └─────────────┘   │  │  └─────────────┘   │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │  考勤统计卡片        │  │  福利与培训卡片      │          │
│  │                     │  │                     │          │
│  │  本月迟到：1 次      │  │  培训预算：3200/5000 │          │
│  │  忘打卡：0 次        │  │  体检：已完成        │          │
│  │  调休余额：16 小时   │  │  生日福利：已领取    │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  请假记录汇总                                        │   │
│  │  病假 1 天 │ 事假 0 天 │ 婚假 0 天 │ 产假 0 天       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  补贴明细                                            │   │
│  │  通讯补贴 200 元/月 │ 交通补贴 500 元/月 │ 餐补 660 元 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 组件规范

#### ProfileHeader（个人信息头部）

- **头像**：圆形占位头像（首字母或默认图标），80x80px
- **姓名**：`profile.realName`，24px 加粗
- **职级职位**：`P5 · 前端开发工程师`，16px 次要文字色
- **部门**：`技术研发部`，14px
- **入职信息**："入职：2024-03-15 · 已入职 1 年 2 个月"，14px 次要色
- **试用期标签**：如 `isProbation: true`，显示橙色"试用期"标签

#### StatCard（统计卡片）

- **样式**：圆角卡片，白色背景（深色模式 `#1e1e1e`），阴影 `var(--shadow)`
- **标题**：16px 加粗，顶部左侧
- **指标**：2-3 个并排指标，每个居中
  - 上方数字：28px 加粗，主色或强调色
  - 下方标签：12px，次要文字色
- **底部进度条/总结**：如年假"剩余 3 天"用绿色背景 pill 展示

#### 数据颜色规范

| 数据类型   | 正常状态       | 警示状态       | 条件               |
| ---------- | -------------- | -------------- | ------------------ |
| 年假剩余   | 绿色 `#388e3c` | 橙色 `#f57c00` | 剩余 ≤ 1 天        |
| 迟到次数   | 绿色           | 橙色           | ≥ 3 次（即将扣款） |
| 待审批报销 | 蓝色           | —              | —                  |
| 培训预算   | 绿色           | 橙色           | 剩余 ≤ 500 元      |
| 忘打卡次数 | 绿色           | 红色           | ≥ 2 次（即将用完） |

### 8.4 加载与空状态

- **加载中**：骨架屏（Skeleton），卡片区域显示脉冲占位
- **数据获取**：页面挂载时调用 `GET /api/me`
- **错误状态**：显示"加载失败，请刷新重试" + 刷新按钮

### 8.5 响应式适配

- **桌面端（≥1024px）**：4 列网格，卡片并排
- **平板端（768-1023px）**：2 列网格
- **移动端（<768px）**：单列堆叠，卡片全宽

---

## 9. 验收标准

- [ ] `/profile` 页面展示当前登录用户的完整个人信息
- [ ] 头像、姓名、职级、部门、入职日期正确显示
- [ ] 年假卡片显示：总 5 天 / 已用 2 天 / 剩余 3 天
- [ ] 报销卡片显示：总额 3250 / 待审 800 / 已到账 2450
- [ ] 考勤卡片显示：本月迟到 1 次 / 忘打卡 0 次 / 调休 16h
- [ ] 福利卡片显示：培训预算 3200/5000 / 体检已完成 / 生日已领取
- [ ] 补贴明细展示通讯 200 + 交通 500 + 餐补 660
- [ ] 请假记录展示病假/事假/婚假/产假天数
- [ ] 警示状态正确显示颜色（如迟到 3 次变橙色）
- [ ] 深色模式下所有卡片对比度舒适
- [ ] 移动端单列布局正常
- [ ] employee 登录后问"我还有多少天年假"，回答"你还有 3 天年假剩余"
- [ ] employee 问"我今年报销了多少钱"，回答"3250 元"
- [ ] employee 问"我这个月还能迟到几次不扣钱"，回答"还能免罚迟到 2 次"
- [ ] employee 问"我的培训预算还剩多少"，回答"3200 元"
- [ ] hr 登录后问"我还有多少天年假"，回答"你还有 10 天年假剩余"
- [ ] 问"年假怎么请"（非个人问题），不注入个人数据，只基于制度文档回答
- [ ] 问"我的工资是多少"，拒绝回答并提示联系 HR
- [ ] 问"张三有多少天年假"，拒绝回答（跨用户隐私）
- [ ] 个人数据回答同时标注制度来源（如引用《年假制度》解释 5 天的依据）
- [ ] `/api/me` 返回当前登录用户的完整 profile

---

## 10. 与其他模块的关系

```
UserProfileModule
    ├── 被 AuthModule 依赖（用户初始化时加载 profile）
    ├── 被 RAGService 依赖（个人查询识别 + Prompt 注入）
    ├── 被 AskController 依赖（GET /api/me）
    └── 独立存储内存用户表（含 profile）
```

---

## 11. Spec 演进记录

| 日期       | 版本 | 变更内容                                                           |
| ---------- | ---- | ------------------------------------------------------------------ |
| 2026-05-18 | v1.0 | 初始版本，新增用户个人数据模块，支持"我有多少天年假"类个人查询     |
| 2026-05-18 | v1.1 | 增加前端 Profile 页面规范（`/profile` 路由、统计卡片、响应式布局） |

# Feature Spec：餐补福利计算与请假日历展示

> 本 Feature 扩展用户个人数据模块，增加请假具体日期记录、月度餐补自动计算、请假日历可视化展示，以及 RAG 对话中针对餐补/请假月度统计的智能问答能力。
>
> 对应模块：user-profile-spec.md（数据模型扩展）、rag-spec.md（关键词扩展）、api-spec.md（接口扩展）
>
> 状态：待实现

---

## 1. 需求背景与目标

### 1.1 背景

当前系统的 `UserProfile` 仅记录请假天数统计（如 `annualLeaveUsed: 2`），但缺少具体的请假日期。员工无法直观查看"我哪天请了假"，也无法基于具体请假日期精确计算月度餐补。

### 1.2 目标

1. **精确餐补计算**：根据具体请假日期，按天扣减餐补（全天请假扣 30 元，半天请假不扣）。
2. **请假日历可视化**：在 Profile 页以日历形式展示每月请假分布。
3. **月度餐补统计**：展示每月可申报餐补额度、扣除明细、实发金额、申报状态。
4. **RAG 智能问答**：支持"我这个月请了几天假？""我上个月餐补是多少？"等基于个人数据的自然语言查询。

### 1.3 明确不做

- ❌ 餐补申报功能（仅做统计展示，不做实际申报流程）
- ❌ 请假申请功能（仅展示已有请假记录）
- ❌ 连接真实考勤系统（仍为内存预置数据）
- ❌ 导出报表功能

---

## 2. 数据模型设计

### 2.1 LeaveRecord（请假记录）

```typescript
interface LeaveRecord {
  /** 请假日期，ISO 格式，如 "2025-05-15" */
  date: string;

  /** 请假类型 */
  type: 'annual' | 'sick' | 'personal' | 'marriage' | 'maternity';

  /** 请假时长（天）
   * 1 = 全天，0.5 = 半天
   * 半天假不扣除餐补
   */
  duration: number;
}
```

### 2.2 MonthlyMealSubsidy（月度餐补统计）

```typescript
interface MonthlyMealSubsidy {
  /** 年份 */
  year: number;

  /** 月份 1-12 */
  month: number;

  /** 该月工作日总数（默认 22 天） */
  totalWorkdays: number;

  /** 全天请假天数（扣餐补） */
  fullDayLeaveCount: number;

  /** 半天请假天数（不扣餐补） */
  halfDayLeaveCount: number;

  /** 每日餐补金额（固定 30 元） */
  dailyAmount: number;

  /** 应发总额 = totalWorkdays * dailyAmount */
  totalAmount: number;

  /** 扣除金额 = fullDayLeaveCount * dailyAmount（半天假不扣） */
  deductedAmount: number;

  /** 实发金额 = totalAmount - deductedAmount */
  payableAmount: number;

  /** 是否已申报（默认当年 1 月至上月为 true，当月及以后为 false） */
  isClaimed: boolean;
}
```

### 2.3 UserProfile 扩展

在现有 `UserProfile` 接口上增加两个字段：

```typescript
interface UserProfile {
  // ... 现有字段保持不变 ...

  /** 本年度请假记录列表（按日期升序排列） */
  leaveRecords: LeaveRecord[];

  /** 本年度月度餐补统计（按月份升序排列，1-12 月） */
  monthlyMealSubsidies: MonthlyMealSubsidy[];
}
```

---

## 3. 预置数据设计

### 3.1 请假记录预置数据

请假日期分布需覆盖多个月份、多种请假类型、全天/半天混合，且满足以下约束：

- 员工（employee）年假已用 2 天 → 至少 2 条 `type: 'annual'` 记录
- 员工病假已用 1 天 → 至少 1 条 `type: 'sick'` 记录
- 事假已用 0 天 → 可以没有，或为了测试添加少量
- 半天假（duration: 0.5）必须存在，用于验证"半天不扣餐补"规则

**员工（employee）预置请假记录**：

```typescript
const employeeLeaveRecords: LeaveRecord[] = [
  // 1月 — 1天年假（全天，扣餐补）
  { date: '2025-01-10', type: 'annual', duration: 1 },

  // 2月 — 半天病假（不扣餐补）
  { date: '2025-02-18', type: 'sick', duration: 0.5 },

  // 3月 — 1天年假（全天，扣餐补）
  { date: '2025-03-05', type: 'annual', duration: 1 },

  // 4月 — 1天事假（全天，扣餐补）+ 半天事假（不扣）
  { date: '2025-04-15', type: 'personal', duration: 1 },
  { date: '2025-04-22', type: 'personal', duration: 0.5 },

  // 5月 — 半天年假（不扣餐补）
  { date: '2025-05-20', type: 'annual', duration: 0.5 },

  // 6月 — 1天病假（全天，扣餐补）— 当月未申报
  { date: '2025-06-03', type: 'sick', duration: 1 },
];
```

**HR（hr）预置请假记录**：

```typescript
const hrLeaveRecords: LeaveRecord[] = [
  { date: '2025-01-08', type: 'annual', duration: 1 },
  { date: '2025-02-14', type: 'annual', duration: 1 },
  { date: '2025-03-20', type: 'sick', duration: 0.5 },
  { date: '2025-04-10', type: 'personal', duration: 1 },
  { date: '2025-05-06', type: 'annual', duration: 1 },
  { date: '2025-05-28', type: 'annual', duration: 1 },
  { date: '2025-06-12', type: 'sick', duration: 1 },
];
```

> 注：当前日期假设为 2025 年 6 月，因此 1-5 月餐补应显示"已申报"，6 月显示"未申报"。如实际系统日期不同，请按"当年 1 月至上月 = 已申报，当月及以后 = 未申报"规则生成。

### 3.2 月度餐补自动计算

月度餐补数据**不硬编码**，由 `UserProfileService` 根据 `leaveRecords` 和当前日期**动态计算**。

**计算规则**：

```typescript
function calculateMonthlyMealSubsidies(
  leaveRecords: LeaveRecord[],
  currentYear: number,
  currentMonth: number, // 1-12
): MonthlyMealSubsidy[] {
  const DAILY_AMOUNT = 30;
  const DEFAULT_WORKDAYS = 22;

  const result: MonthlyMealSubsidy[] = [];

  for (let month = 1; month <= 12; month++) {
    // 筛选该月的请假记录
    const monthLeaves = leaveRecords.filter((r) => {
      const d = new Date(r.date);
      return d.getFullYear() === currentYear && d.getMonth() + 1 === month;
    });

    const fullDayLeaveCount = monthLeaves
      .filter((r) => r.duration >= 1)
      .reduce((sum, r) => sum + r.duration, 0);

    const halfDayLeaveCount = monthLeaves
      .filter((r) => r.duration === 0.5)
      .length;

    const totalAmount = DEFAULT_WORKDAYS * DAILY_AMOUNT;
    const deductedAmount = Math.round(fullDayLeaveCount * DAILY_AMOUNT);
    const payableAmount = totalAmount - deductedAmount;

    // 申报状态：1月至上月为已申报，当月及以后为未申报
    const isClaimed = month < currentMonth;

    result.push({
      year: currentYear,
      month,
      totalWorkdays: DEFAULT_WORKDAYS,
      fullDayLeaveCount,
      halfDayLeaveCount,
      dailyAmount: DAILY_AMOUNT,
      totalAmount,
      deductedAmount,
      payableAmount,
      isClaimed,
    });
  }

  return result;
}
```

**关键规则强调**：

| 请假类型 | 时长 | 餐补扣除 | 说明 |
|---------|------|---------|------|
| 年假/病假/事假/婚假/产假 | 1 天 | 扣 30 元 | 全天请假扣除 |
| 年假/病假/事假/婚假/产假 | 0.5 天 | 不扣 | 半天请假不扣除餐补 |
| 无请假 | — | 不扣 | 全额发放 660 元 |

---

## 4. 后端接口变更

### 4.1 GET /api/me 响应扩展

现有 `/api/me` 接口的 `profile` 字段需包含新增的 `leaveRecords` 和 `monthlyMealSubsidies`。

**扩展后响应示例**：

```json
{
  "id": "user-1",
  "username": "employee",
  "role": "employee",
  "displayName": "员工",
  "profile": {
    "realName": "李明",
    "department": "技术研发部",
    "position": "前端开发工程师",
    "level": "P5",
    "annualLeaveTotal": 5,
    "annualLeaveUsed": 2,
    "annualLeaveRemaining": 3,
    "sickLeaveUsed": 1,
    "personalLeaveUsed": 0,
    "mealSubsidy": 660,
    "leaveRecords": [
      { "date": "2025-01-10", "type": "annual", "duration": 1 },
      { "date": "2025-02-18", "type": "sick", "duration": 0.5 },
      { "date": "2025-03-05", "type": "annual", "duration": 1 },
      { "date": "2025-04-15", "type": "personal", "duration": 1 },
      { "date": "2025-04-22", "type": "personal", "duration": 0.5 },
      { "date": "2025-05-20", "type": "annual", "duration": 0.5 },
      { "date": "2025-06-03", "type": "sick", "duration": 1 }
    ],
    "monthlyMealSubsidies": [
      {
        "year": 2025,
        "month": 1,
        "totalWorkdays": 22,
        "fullDayLeaveCount": 1,
        "halfDayLeaveCount": 0,
        "dailyAmount": 30,
        "totalAmount": 660,
        "deductedAmount": 30,
        "payableAmount": 630,
        "isClaimed": true
      },
      {
        "year": 2025,
        "month": 2,
        "totalWorkdays": 22,
        "fullDayLeaveCount": 0,
        "halfDayLeaveCount": 1,
        "dailyAmount": 30,
        "totalAmount": 660,
        "deductedAmount": 0,
        "payableAmount": 660,
        "isClaimed": true
      }
    ]
  }
}
```

### 4.2 新增 API：GET /api/me/leave-records

| 属性 | 值 |
|------|-----|
| 路径 | `/api/me/leave-records` |
| 方法 | GET |
| 认证 | Bearer JWT |
| 参数 | `?year=2025&month=6`（可选，默认当年当月） |

**响应 200**：

```json
{
  "year": 2025,
  "month": 6,
  "records": [
    { "date": "2025-06-03", "type": "sick", "duration": 1 }
  ],
  "summary": {
    "fullDayCount": 1,
    "halfDayCount": 0,
    "totalDeduction": 30
  }
}
```

### 4.3 新增 API：GET /api/me/meal-subsidy

| 属性 | 值 |
|------|-----|
| 路径 | `/api/me/meal-subsidy` |
| 方法 | GET |
| 认证 | Bearer JWT |
| 参数 | `?year=2025&month=6`（可选，默认当年当月） |

**响应 200**：

```json
{
  "year": 2025,
  "month": 6,
  "dailyAmount": 30,
  "totalWorkdays": 22,
  "fullDayLeaveCount": 1,
  "halfDayLeaveCount": 0,
  "totalAmount": 660,
  "deductedAmount": 30,
  "payableAmount": 630,
  "isClaimed": false
}
```

---

## 5. RAG Prompt 注入扩展

### 5.1 个人查询识别规则扩展

在 `isPersonalQuery()` 中增加餐补/请假月度统计相关关键词：

```typescript
function isPersonalQuery(query: string): boolean {
  const lower = query.toLowerCase();

  // 现有规则保持不变 ...

  // 新增：餐补相关查询（含同义词）
  const mealSubsidyKeywords = /餐补|食补|饭贴|午餐补贴|餐饮补贴/;
  const monthKeywords = /这个月|上个月|本月|上月|这几个月|今年/;
  const leaveDayKeywords = /请了几天假|休了几天|请假天数/;

  if (firstPerson.test(lower) && mealSubsidyKeywords.test(lower)) {
    return true;
  }

  if (firstPerson.test(lower) && monthKeywords.test(lower) && leaveDayKeywords.test(lower)) {
    return true;
  }

  // 新增：具体月份 + 餐补/请假
  const specificMonthPattern = /(?:我|我的).*?(?:1月|2月|3月|4月|5月|6月|7月|8月|9月|10月|11月|12月).*?(?:餐补|食补|饭贴|请假|休假)/;
  if (specificMonthPattern.test(lower)) {
    return true;
  }

  return false;
}
```

### 5.2 Prompt 格式化扩展

`formatForPrompt()` 方法需增加"请假记录明细"和"月度餐补统计"两个板块：

```typescript
function formatForPrompt(profile: UserProfile): string {
  // 保留原有所有板块
  const existingSections = formatExistingSections(profile);

  // 新增：请假记录明细
  const leaveRecordsSection = formatLeaveRecords(profile.leaveRecords);

  // 新增：月度餐补统计
  const mealSubsidySection = formatMealSubsidies(profile.monthlyMealSubsidies);

  return `${existingSections}\n\n${leaveRecordsSection}\n\n${mealSubsidySection}`;
}

function formatLeaveRecords(records: LeaveRecord[]): string {
  if (records.length === 0) return '### 请假记录\n本年度暂无请假记录。';

  const lines = records.map((r) => {
    const typeMap: Record<string, string> = {
      annual: '年假',
      sick: '病假',
      personal: '事假',
      marriage: '婚假',
      maternity: '产假',
    };
    const durationText = r.duration === 0.5 ? '半天' : '全天';
    return `- ${r.date}：${typeMap[r.type]}（${durationText}）`;
  });

  return `### 请假记录明细\n本年度共请假 ${records.length} 次：\n${lines.join('\n')}`;
}

function formatMealSubsidies(subsidies: MonthlyMealSubsidy[]): string {
  const currentMonth = new Date().getMonth() + 1;
  const currentSubsidy = subsidies.find((s) => s.month === currentMonth);

  const lines = subsidies.map((s) => {
    const status = s.isClaimed ? '已申报' : '未申报';
    const halfDayNote = s.halfDayLeaveCount > 0 ? `（含${s.halfDayLeaveCount}个半天假，不扣餐补）` : '';
    return `- ${s.month}月：工作日${s.totalWorkdays}天，请假${s.fullDayLeaveCount}天${halfDayNote}，应发${s.totalAmount}元，扣除${s.deductedAmount}元，实发${s.payableAmount}元【${status}】`;
  });

  let summary = '';
  if (currentSubsidy) {
    summary = `\n\n本月（${currentMonth}月）餐补：实发 ${currentSubsidy.payableAmount} 元，${currentSubsidy.isClaimed ? '已申报' : '未申报'}。`;
  }

  return `### 月度餐补统计\n餐补规则：工作日每天 ${subsidies[0]?.dailyAmount ?? 30} 元，每月按 22 个工作日计算。全天请假扣除当天餐补，半天请假不扣除。\n\n${lines.join('\n')}${summary}`;
}
```

### 5.3 RAG 回答示例

**示例 1：月度餐补查询**

**用户**："我这个月的餐补是多少？"

**Prompt 注入**：包含该员工 6 月请假记录（1 天病假全天）和月度餐补统计

**AI 回答**：

> 你本月（6 月）的餐补实发金额为 **630 元**。
>
> 计算明细：工作日 22 天 × 30 元 = 660 元，扣除 1 天全天病假 30 元，实发 630 元。本月餐补状态为**未申报**。
>
> 📄 来源：《员工福利》，相似度 88%

**示例 2：上个月请假天数查询**

**用户**："我上个月请了几天假？"

**AI 回答**：

> 你上个月（5 月）请了 1 次假，为 **半天年假**（5 月 20 日）。
>
> 由于这是半天假，不扣除餐补，5 月餐补实发全额 660 元。

**示例 3：同义词识别**

**用户**："我这个月的饭贴是多少？"

**处理**："饭贴"匹配餐补同义词，识别为个人查询 → 注入餐补数据 → 回答

---

## 6. 前端 Profile 页面扩展

### 6.1 新增板块：请假日历

在 Profile 页现有布局基础上，于"补贴明细"下方增加"请假日历"板块。

#### 布局设计

```
┌─────────────────────────────────────────────────────────────┐
│  现有内容（个人信息卡片、年假/报销/考勤/福利统计卡片）          │
├─────────────────────────────────────────────────────────────┤
│  请假记录汇总（现有，保留）                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  请假日历 + 月度餐补统计                              │   │
│  │                                                      │   │
│  │  [年份选择 ▼]  [月份选择 ▼]  ← 默认当年当月           │   │
│  │                                                      │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │         2025 年 6 月                          │  │   │
│  │  │  日  一  二  三  四  五  六                    │  │   │
│  │  │  1   2   3   4   5   6   7                    │  │   │
│  │  │              [3]  4   5   6   7               │  │   │
│  │  │  8   9  10  11  12  13  14                    │  │   │
│  │  │ ...                                          │  │   │
│  │  │                                              │  │   │
│  │  │  图例：🟡 年假  🔵 病假  🟠 事假  🟣 半天假   │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │  6 月餐补统计                                   │ │   │
│  │  │  应发：660 元                                   │ │   │
│  │  │  扣除：30 元（1 天全天病假）                     │ │   │
│  │  │  实发：630 元                                   │ │   │
│  │  │  状态：未申报 🔴                                │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │  本年度餐补汇总                                 │ │   │
│  │  │  1月 630 ✅  2月 660 ✅  3月 630 ✅ ...         │ │   │
│  │  │  已申报总额：3180 元                            │ │   │
│  │  │  未申报总额：630 元                             │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 日历组件规范

**Calendar 组件**：

- **月份切换**：左右箭头或下拉选择器，切换时重新渲染日历
- **日期渲染**：
  - 普通日期：默认样式
  - 有请假记录的日期：显示对应颜色圆点/背景色
  - 当天：加粗 + 边框高亮
- **请假类型颜色映射**：

| 请假类型 | 颜色 | 色值（浅色模式） | 色值（深色模式） |
|---------|------|----------------|----------------|
| 年假 | 黄色 | `#FFF9C4` | `#F9A825` |
| 病假 | 蓝色 | `#BBDEFB` | `#1976D2` |
| 事假 | 橙色 | `#FFE0B2` | `#EF6C00` |
| 婚假 | 粉色 | `#F8BBD0` | `#C2185B` |
| 产假 | 紫色 | `#E1BEE7` | `#7B1FA2` |
| 半天假 | 在颜色基础上加半圆/虚线边框标识 | — | — |

- **Hover 交互**：鼠标悬停在有请假的日期上，显示 Tooltip：
  - 日期 + 请假类型 + 时长（"全天"或"半天"）
- **点击交互**：点击日期无跳转（当前版本不做详情弹窗）

#### 月度餐补卡片规范

- **标题**："{year} 年 {month} 月 餐补统计"
- **指标行**：
  - 应发金额：`totalAmount` 元（灰色次要文字）
  - 扣除金额：`deductedAmount` 元（红色，如 > 0）
  - 实发金额：`payableAmount` 元（绿色加粗，核心指标）
- **申报状态**：
  - 已申报：绿色勾选图标 + "已申报"文字
  - 未申报：红色圆点 + "未申报"文字
- **请假明细**：列出当月所有请假记录（日期 + 类型 + 时长 + 是否扣款）

#### 年度餐补汇总条

- **展示形式**：1-12 月小卡片横向排列（桌面端）或 2 行 6 列（移动端）
- **每个小卡片**：
  - 月份（如"1月"）
  - 实发金额（如"630"）
  - 状态标识（✅ 已申报 / 🔴 未申报）
- **点击交互**：点击某月小卡片，日历和月度统计切换到该月

### 6.2 响应式适配

- **桌面端（≥1024px）**：日历占 60% 宽度，月度统计占 40% 宽度，并排展示
- **平板端（768-1023px）**：日历在上，月度统计在下
- **移动端（<768px）**：日历全宽，月度统计全宽，年度汇总条横向滚动

### 6.3 空状态

- **无请假记录**：日历中所有日期为默认样式，月度统计显示"本月无请假记录，餐补全额发放 660 元"
- **数据加载中**：日历区域显示骨架屏（脉冲占位格子）

---

## 7. 后端 Service 变更

### 7.1 UserProfileService 扩展

```typescript
interface IUserProfileService {
  // 现有方法保持不变
  getProfile(userId: string): UserProfile | null;
  isPersonalQuery(query: string): boolean;
  formatForPrompt(profile: UserProfile): string;
  getAllUsers(): User[];

  // 新增方法
  getLeaveRecords(userId: string, year: number, month: number): LeaveRecord[];
  getMonthlyMealSubsidy(userId: string, year: number, month: number): MonthlyMealSubsidy | null;
  calculateMonthlyMealSubsidies(leaveRecords: LeaveRecord[]): MonthlyMealSubsidy[];
}
```

### 7.2 AuthService 预置数据更新

`EMPLOYEE_PROFILE` 和 `HR_PROFILE` 需增加 `leaveRecords` 字段，且 `monthlyMealSubsidies` 由 `UserProfileService.calculateMonthlyMealSubsidies()` 在运行时动态生成（不硬编码在常量中）。

---

## 8. 模块 Spec 联动更新清单

实施本 Feature 时，需同步更新以下模块级 Spec：

| Spec 文件 | 更新内容 |
|-----------|---------|
| `specs/modules/user-profile-spec.md` | 扩展 `UserProfile` 接口（增加 `leaveRecords`、`monthlyMealSubsidies`）；扩展 `isPersonalQuery()` 规则（增加餐补/同义词/月度请假）；扩展 `formatForPrompt()`（增加请假明细和月度餐补板块）；更新预置数据；更新前端 Profile 页面规范 |
| `specs/modules/rag-spec.md` | 扩展 `HR_KEYWORDS` 数组（增加"餐补""食补""饭贴""午餐补贴"等）；扩展 `isPersonalQuery` 相关描述 |
| `specs/modules/api-spec.md` | 新增 `GET /api/me/leave-records` 和 `GET /api/me/meal-subsidy` 接口定义；更新 `GET /api/me` 响应示例 |

---

## 9. 验收标准

### 9.1 数据模型

- [ ] `UserProfile` 接口包含 `leaveRecords: LeaveRecord[]` 和 `monthlyMealSubsidies: MonthlyMealSubsidy[]`
- [ ] `LeaveRecord` 包含 `date`、`type`、`duration` 三个字段
- [ ] `MonthlyMealSubsidy` 包含所有 11 个字段（year 到 isClaimed）
- [ ] 预置数据中员工有 7 条请假记录，HR 有 7 条请假记录
- [ ] 预置数据包含至少 2 条 `duration: 0.5` 的半天假记录

### 9.2 餐补计算逻辑

- [ ] 每月默认 22 个工作日，每日餐补 30 元
- [ ] 全天请假（duration ≥ 1）扣除当天餐补 30 元
- [ ] 半天请假（duration = 0.5）**不扣除**餐补
- [ ] 无请假月份实发 660 元
- [ ] 员工 1 月请假 1 天 → 实发 630 元
- [ ] 员工 2 月半天病假 → 实发 660 元（不扣）
- [ ] 员工 4 月 1 天全天 + 1 个半天 → 扣除 30 元，实发 630 元
- [ ] 月度餐补数据由后端动态计算，不硬编码

### 9.3 后端接口

- [ ] `GET /api/me` 的 `profile` 包含完整 `leaveRecords` 和 `monthlyMealSubsidies`
- [ ] `GET /api/me/leave-records?year=2025&month=6` 返回当月请假列表和汇总
- [ ] `GET /api/me/meal-subsidy?year=2025&month=6` 返回当月餐补统计
- [ ] 未提供 year/month 参数时，默认使用当前年份和月份

### 9.4 RAG 问答

- [ ] 问"我这个月的餐补是多少？" → 返回本月实发金额
- [ ] 问"我上个月请了几天假？" → 返回上月请假天数和类型
- [ ] 问"我这个月的饭贴是多少？" → 识别"饭贴"为餐补同义词，正确回答
- [ ] 问"我这个月的食补是多少？" → 识别"食补"为餐补同义词，正确回答
- [ ] 问"我 4 月请了几天假？" → 返回 4 月请假明细
- [ ] 问"我上个月餐补为什么少了？" → 结合请假记录解释扣除原因
- [ ] 问"我哪几天请了年假？" → 返回本年度所有年假日期
- [ ] 非个人查询（如"餐补制度是什么？"）不注入个人数据

### 9.5 前端 Profile 页

- [ ] 显示请假日历组件，正确渲染当月日期网格
- [ ] 有请假的日期显示对应颜色标识
- [ ] 半天假有区别于全天假的视觉标识（如半圆、虚线边框）
- [ ] Hover 在请假日期上显示 Tooltip（日期 + 类型 + 时长）
- [ ] 月份切换器可切换不同月份，日历和统计同步更新
- [ ] 月度餐补统计卡片显示应发/扣除/实发金额
- [ ] 申报状态正确显示（已申报绿色 ✅ / 未申报红色 🔴）
- [ ] 年度餐补汇总条显示 1-12 月实发金额和申报状态
- [ ] 点击年度汇总某月，切换到该月日历和统计
- [ ] 无请假记录月份显示"本月无请假，餐补全额发放"
- [ ] 深色模式下日历和统计卡片对比度舒适

### 9.6 边界情况

- [ ] 切换年份到没有数据的年份 → 显示"该年度暂无请假记录"
- [ ] 闰年 2 月正确处理（但当前不根据实际工作日历计算，仍按 22 天）
- [ ] 数据加载失败时显示错误状态和重试按钮

---

## 10. Task 拆分（AI 代码生成指南）

> 本 Feature 拆分为 4 个 Task，按顺序执行。每个 Task 完成后必须 `git commit` 并运行 `pnpm lint` 确保 0 error。
>
> 编号说明：`Task-010`（UserProfile 模块 + Profile 页面）和 `Task-011`（热门问题 + 连接状态）已被占用，本 Feature 从 **Task-012** 开始。

### Task-012：扩展数据模型与预置数据 + 餐补计算引擎

**范围**：后端数据层

**输入**：Feature Spec Section 2（数据模型）、Section 3（预置数据）

**输出**：
- `apps/api/src/auth/auth.interface.ts` — 扩展 `UserProfile` 接口（`leaveRecords`、`monthlyMealSubsidies`）和预置数据
- `apps/api/src/user-profile/user-profile.interface.ts` — 扩展 `IUserProfileService`
- `apps/api/src/user-profile/user-profile.service.ts` — 实现 `calculateMonthlyMealSubsidies()` 动态计算

**核心逻辑**：
- 每月默认 22 个工作日，每日 30 元
- 全天请假（duration ≥ 1）扣除 30 元
- 半天请假（duration = 0.5）**不扣除**
- 申报状态：1 月至上月 = 已申报，当月及以后 = 未申报

**验收标准**：
- `UserProfile` 包含 `leaveRecords` 和 `monthlyMealSubsidies`
- 员工预置 7 条请假记录，HR 预置 7 条
- 至少 2 条 `duration: 0.5` 的半天假
- `calculateMonthlyMealSubsidies()` 计算结果正确（1 月 630 元、2 月 660 元、4 月 630 元等）

---

### Task-013：后端接口扩展

**范围**：后端 API 层

**输入**：Feature Spec Section 4（后端接口变更）

**输出**：
- `apps/api/src/auth/auth.controller.ts` — 新增两个端点

**新增端点**：

| 端点 | 说明 |
|------|------|
| `GET /api/me/leave-records?year=&month=` | 返回当月请假列表和汇总（fullDayCount/halfDayCount/totalDeduction） |
| `GET /api/me/meal-subsidy?year=&month=` | 返回当月餐补统计（totalAmount/deductedAmount/payableAmount/isClaimed） |

**约束**：
- year/month 参数可选，默认当前年月
- month 范围校验 1-12
- 从 JWT payload 获取 userId

**验收标准**：
- `GET /api/me` 的 `profile` 包含完整 `leaveRecords` 和 `monthlyMealSubsidies`
- 两个新端点返回格式与 Spec 一致

---

### Task-014：RAG Prompt 注入扩展

**范围**：后端 AI 层

**输入**：Feature Spec Section 5（RAG Prompt 注入扩展）

**输出**：
- `apps/api/src/user-profile/user-profile.service.ts` — 扩展 `isPersonalQuery()` 和 `formatForPrompt()`
- `apps/api/src/rag/keyword-search.service.ts` — 扩展 `HR_KEYWORDS`

**核心变更**：
- `isPersonalQuery()` 新增规则：
  - 餐补同义词：`/餐补|食补|饭贴|午餐补贴|餐饮补贴/`
  - 月度请假查询：`/这个月|上个月|本月|上月/ + /请了几天假|休了几天/`
  - 具体月份 + 餐补/请假：`/(1月|2月|...|12月).*?(餐补|食补|饭贴|请假)/`
- `formatForPrompt()` 新增两个板块：
  - `### 请假记录明细` — 列出本年度所有请假日期、类型、时长
  - `### 月度餐补统计` — 列出 1-12 月应发/扣除/实发/申报状态
- `HR_KEYWORDS` 新增：`餐补`、`食补`、`饭贴`、`午餐补贴`、`餐饮补贴`

**验收标准**：
- "我这个月的餐补是多少？" → 识别为个人查询
- "我这个月的饭贴是多少？" → 识别同义词
- "我上个月请了几天假？" → 识别为个人查询
- "我 4 月请了几天假？" → 识别为个人查询
- Prompt 注入格式正确，LLM 能基于数据回答

---

### Task-015：前端 Profile 页面扩展

**范围**：前端 UI 层

**输入**：Feature Spec Section 6（前端 Profile 页面扩展）

**输出**：
- `apps/web/src/pages/ProfilePage.tsx` — 新增请假日历、月度餐补统计、年度汇总条
- `apps/web/src/pages/ProfilePage.module.css` — 新增样式
- （可选）新增子组件文件

**组件清单**：

1. **请假日历**
   - 年份/月份选择器，默认当年当月
   - 7 列日历网格（日一二三四五六）
   - 请假日期按类型着色（年假黄、病假蓝、事假橙等）
   - 半天假用半圆/虚线边框区分
   - Hover Tooltip 显示日期 + 类型 + 时长
   - 图例说明

2. **月度餐补统计卡片**
   - 应发金额（灰色）/ 扣除金额（红色）/ 实发金额（绿色加粗）
   - 申报状态（已申报 ✅ 绿色 / 未申报 🔴 红色）
   - 当月请假明细列表

3. **年度餐补汇总条**
   - 1-12 月小卡片网格
   - 显示月份 + 实发金额 + 申报状态
   - 点击切换到对应月份
   - 底部显示已申报总额 / 未申报总额

**响应式**：
- 桌面端：日历 60% + 月度统计 40% 并排
- 平板端：日历在上，统计在下
- 移动端：全宽堆叠，年度汇总横向滚动

**验收标准**：
- 日历正确渲染，月份切换同步更新
- 半天假有区别于全天假的视觉标识
- 月度统计金额和申报状态正确
- 年度汇总点击可切换月份
- 深色模式对比度舒适

---

## 11. 实现建议与注意事项

### 10.1 关于工作日计算

当前版本**简化处理**：每月固定 22 个工作日，不考虑实际节假日调休。如需精确计算，未来可引入中国节假日 API 或配置表。

### 10.2 关于"当前日期"

系统使用 `new Date()` 获取当前日期判断申报状态。为确保演示一致性，建议：
- 预置请假数据的年份与系统当前年份一致
- 如系统当前日期为 2025 年 6 月，则 1-5 月显示"已申报"，6-12 月显示"未申报"

### 10.3 关于同义词扩展

除"餐补/食补/饭贴"外，如有其他常见同义词（如"午餐补贴""餐饮补贴"），可在 `isPersonalQuery()` 和 `HR_KEYWORDS` 中一并添加。

### 10.4 代码变更范围预估

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `apps/api/src/auth/auth.interface.ts` | 修改 | 扩展 `UserProfile` 接口和预置数据 |
| `apps/api/src/user-profile/user-profile.interface.ts` | 修改 | 扩展 `IUserProfileService` 接口 |
| `apps/api/src/user-profile/user-profile.service.ts` | 修改 | 实现请假记录查询、餐补计算、Prompt 格式化扩展 |
| `apps/api/src/auth/auth.controller.ts` | 修改 | 新增 `GET /api/me/leave-records` 和 `GET /api/me/meal-subsidy` 端点 |
| `apps/api/src/rag/rag.service.ts` | 修改 | 确认 `orchestrate()` 中个人数据注入包含新字段 |
| `apps/web/src/pages/ProfilePage.tsx` | 修改 | 增加请假日历、月度餐补统计、年度汇总条 |
| `apps/web/src/pages/ProfilePage.module.css` | 修改 | 增加日历和餐补统计样式 |
| 新增组件文件 | 新增 | `LeaveCalendar.tsx`、 `MealSubsidyCard.tsx`、 `YearlyMealSummary.tsx`（或内联在 ProfilePage） |

---

## 12. Spec 演进记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-18 | v1.0 | 初始版本，新增餐补福利计算、请假日历展示、月度统计、RAG 同义词识别 |

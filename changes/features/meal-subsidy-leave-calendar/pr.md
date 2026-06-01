# feat(meal-subsidy): implement meal subsidy calculation, leave calendar, and RAG personal query extensions

## Summary

完成 Feature Spec `meal-subsidy-leave-calendar` 的全部 4 个 Task（Task-012 ~ Task-015），实现请假日期记录、月度餐补自动计算、请假日历可视化、RAG 智能问答扩展，以及后续的多年度餐补支持和未来月份标识。核心能力包括：基于具体请假日期的按天餐补扣减（全天 -30 元，半天不扣）、Profile 页面新增请假日历 + 月度餐补统计卡片 + 年度汇总条、RAG 管线识别"餐补/食补/饭贴"等同义词并根据个人请假数据生成个性化回答。

## Changes

### Task-012: 扩展数据模型与预置数据 + 餐补计算引擎

**后端修改 — `apps/api/src/auth/auth.interface.ts`**
- 新增 `LeaveType` 类型、`LeaveRecord` 接口（date / type / duration）
- 新增 `MonthlyMealSubsidy` 接口（12 字段: year ~ isFuture）
- `UserProfile` 扩展 `leaveRecords: LeaveRecord[]` 和 `monthlyMealSubsidies: MonthlyMealSubsidy[]`
- `EMPLOYEE_PROFILE` 预置 25 条请假记录，`HR_PROFILE` 预置 24 条，覆盖 2025-2026 年
- 数据多样性: 0 天（空月）、1 天、2 天、3-4 天（春节/国庆前后）、半天假（duration: 0.5）
- 同步更新 `annualLeaveUsed / sickLeaveUsed / personalLeaveUsed` 统计字段

**后端新增 — `apps/api/src/user-profile/user-profile.service.ts`**
- `calculateMonthlyMealSubsidies()` — 按月循环生成 1-12 月餐补统计
  - 每月默认 22 个工作日，每日 30 元
  - 全天请假（duration ≥ 1）扣除当天餐补；半天请假（duration = 0.5）不扣
  - `isClaimed`: 往年 = true，当年 = month < serverMonth，未来年 = false
  - `isFuture`: 未来月份标识，前端灰显不可交互
- `getLeaveRecords(userId, year, month)` — 按用户/年/月筛选请假记录
- `getMonthlyMealSubsidy(userId, year, month)` — 动态计算指定年月的餐补（不依赖 profile 缓存）
- `getProfile()` 修改 — 动态计算并注入所有年份的 `monthlyMealSubsidies`

**后端修改 — `apps/api/src/user-profile/user-profile.interface.ts`**
- `IUserProfileService` 新增 `getLeaveRecords`、`getMonthlyMealSubsidy`、`calculateMonthlyMealSubsidies`

### Task-013: 后端接口扩展

**后端修改 — `apps/api/src/auth/auth.controller.ts`**
- `MeController` 注入 `UserProfileService`
- `GET /api/me` — 改用 `UserProfileService.getProfile()` 确保动态餐补数据注入
- `GET /api/me/leave-records?year=&month=` — 返回当月请假列表 + 汇总（fullDayCount / halfDayCount / totalDeduction）
- `GET /api/me/meal-subsidy?year=&month=` — 返回当月餐补统计（totalAmount / deductedAmount / payableAmount / isClaimed）
- year/month 参数可选（默认当年当月），month 校验 1-12（400），用户不存在（404）

**后端修改 — `apps/api/src/auth/auth.module.ts`**
- 导入 `UserProfileModule` 以支持 `MeController` 注入 `UserProfileService`

### Task-014: RAG Prompt 注入扩展

**后端修改 — `apps/api/src/user-profile/user-profile.service.ts`**
- `isPersonalQuery()` 新增 3 条识别规则:
  - 第一人称 + 餐补同义词 (`/餐补|食补|饭贴|午餐补贴|餐饮补贴/`)
  - 第一人称 + 月份关键词 + 请假天数关键词 (`请了几天假|休了几天|请假天数`)
  - 具体月份 + 餐补/请假 (`/(?:1月|2月|...|12月).*?(?:餐补|食补|饭贴|请假|休假)/`)
- `formatForPrompt()` 新增两个板块:
  - `formatLeaveRecords()` — 请假记录明细（日期 + 类型中文 + 全天/半天）
  - `formatMealSubsidies()` — 月度餐补统计（1-12 月应发/扣除/实发/申报状态 + 规则说明 + 本月摘要）

**后端修改 — `apps/api/src/rag/keyword-search.service.ts`**
- `HR_KEYWORDS` 新增 5 个条目: `餐补`、`食补`、`饭贴`、`午餐补贴`、`餐饮补贴`

### Task-015: 前端 Profile 页面扩展

**前端修改 — `apps/web/src/pages/ProfilePage.tsx`**
- 新增 `LeaveRecord` / `MonthlyMealSubsidy` 接口（含 `isFuture`）
- 日历组件: 年/月下拉选择器（默认服务器当月），7 列网格，5 种请假类型着色
  - 年假 = 黄、病假 = 蓝、事假 = 橙、婚假 = 粉、产假 = 紫
  - 全天假底部实心圆点，半天假虚线圆圈
  - CSS `[data-tooltip]::after` 悬停提示（日期 + 类型 + 时长）
  - 底部图例行 + 半天假虚线标识
- 月度餐补统计卡片: 应发（灰色）/ 扣除（红色）/ 实发（绿色加粗），申报状态，请假明细列表（含扣款/不扣款标签）
- 年度餐补汇总条: 12 月可点击卡片网格 + 年份下拉框，选中月份高亮（accent ring），已申报/未申报总额
- 未来月份处理: `maxSelectableMonth` 过滤选择器，汇总卡片灰显（opacity 0.4）+ disabled + 显示 "—"
- 数据来源: `GET /api/me` 的 `profile.leaveRecords` 和 `profile.monthlyMealSubsidies`

**前端新增样式 — `apps/web/src/pages/ProfilePage.module.css`**
- 日历区域: `.calendarSection` / `.calendarGrid` / `.calendarCell` / `.dayHeader` / `.dayNumber`
- 5 种请假类型颜色类（`.leaveTypeAnnual` ~ `.leaveTypeMaternity`）+ 深色模式变体
- `.halfDayIndicator` 虚线圆圈 + `.fullDayIndicator` 实心圆点
- 餐补卡片: `.mealCard` / `.mealStats` / `.mealPayable`(绿色加粗) / `.mealDeducted`(红色)
- 年度汇总: `.yearlyGrid`(6 列) / `.yearlyCard` / `.yearlyCardActive` / `.yearlyCardDisabled`
- 工具提示: `.calendarCell[data-tooltip]:hover::after`
- 响应式: `≥1024px` 日历+卡片并排(3fr:2fr)，`<1024px` 堆叠，`<640px` 年度汇总 3 列

## Key Architecture

```
apps/api/src/
├── auth/
│   ├── auth.interface.ts              # Task-012 — LeaveRecord / MonthlyMealSubsidy 接口 + 预置数据
│   ├── auth.controller.ts             # Task-013 — 新增 /me/leave-records + /me/meal-subsidy
│   └── auth.module.ts                 # Task-013 — 导入 UserProfileModule
├── user-profile/
│   ├── user-profile.interface.ts      # Task-012 — IUserProfileService 扩展
│   └── user-profile.service.ts        # Task-012/014 — 餐补计算 + RAG 注入
└── rag/
    └── keyword-search.service.ts      # Task-014 — HR_KEYWORDS 扩展
```

```
apps/web/src/
└── pages/
    ├── ProfilePage.tsx                # Task-015 — 请假日历 / 月度餐补 / 年度汇总
    └── ProfilePage.module.css         # Task-015 — 全套样式 + 深色模式 + 响应式
```

### 餐补计算流程

```
GET /api/me/meal-subsidy?year=2025&month=1
  → MeController.getMealSubsidy(req, year, month)
  → UserProfileService.getMonthlyMealSubsidy(userId, 2025, 1)
    → AuthService.getUserById(userId) → leaveRecords
    → calculateMonthlyMealSubsidies(leaveRecords, 2025)
      → 1月: 筛选 2025-01 请假 → 1 天全天年假
      → fullDayLeaveCount=1, halfDayLeaveCount=0
      → totalAmount=660, deductedAmount=30, payableAmount=630
      → serverYear=2026, 2025 < 2026 → isClaimed=true, isFuture=false
    → 返回 1 月餐补对象
  → Response: { year: 2025, month: 1, payableAmount: 630, isClaimed: true }
```

### 个人问题识别（餐补/请假扩展）

| 用户问题 | isPersonalQuery | 处理方式 |
|---------|:---:|------|
| "我这个月的餐补是多少？" | true | 注入餐补数据，回答实发金额 |
| "我这个月的饭贴是多少？" | true | 同义词"饭贴"匹配，注入餐补数据 |
| "我上个月请了几天假？" | true | 注入请假记录，回答上月请假明细 |
| "我 4 月请了几天假？" | true | 具体月份 + 请假 匹配 |
| "餐补制度是什么？" | false | 纯 RAG 检索，不注入个人数据 |

## Verification

- `pnpm lint` — 0 errors
- `GET /api/me` — profile 包含 `leaveRecords`（25 条）和 `monthlyMealSubsidies`（2025 + 2026 共 24 条）
- `GET /api/me/leave-records?year=2025&month=1` — 返回 1 条记录 + summary(fullDayCount=1, halfDayCount=0, totalDeduction=30)
- `GET /api/me/meal-subsidy?year=2025&month=1` — payableAmount=630, isClaimed=true
- `GET /api/me/meal-subsidy?year=2025&month=2` — payableAmount=660（半天假不扣）, isClaimed=true
- `/profile` 页面 — 请假日历正确渲染，2025-01-10 黄色年假标识，hover 显示 tooltip
- 切换至 2025-04 — 日历 4/15（橙色事假）+ 4/22（橙色半天虚线），月度统计扣除 30 元实发 630 元
- 年度汇总 — 2026 年 7-12 月卡片灰显不可点击，显示 "—"
- 月份选择器 — 当前 6 月，下拉仅显示 1-6 月（7-12 月被过滤）
- employee 登录 → 问"我这个月的餐补是多少？" → 注入餐补数据 → 回答本月实发金额
- 问"我这个月的饭贴是多少？" → 同义词识别 → 正确回答
- 问"餐补制度是什么？"（非个人问题）→ 不注入个人数据，仅基于制度文档回答
- 深色模式 — 日历颜色适配（年假 #F9A825、病假 #1976D2 等），卡片对比度舒适
- 响应式 — 桌面端日历+卡片并排，平板/手机堆叠，年度汇总 6→4→3 列

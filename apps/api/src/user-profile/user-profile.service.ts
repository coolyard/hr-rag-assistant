import { Injectable, Logger } from '@nestjs/common';

import type {
  LeaveRecord,
  MonthlyMealSubsidy,
  User,
  UserProfile,
} from '@/auth/auth.interface';
import { AuthService } from '@/auth/auth.service';
import type { IUserProfileService } from '@/user-profile/user-profile.interface';

const DAILY_MEAL_AMOUNT = 30;
const DEFAULT_WORKDAYS = 22;

@Injectable()
export class UserProfileService implements IUserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(private readonly authService: AuthService) {}

  getProfile(userId: string): UserProfile | null {
    const user = this.authService.getUserById(userId);
    if (!user) {
      return null;
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const profile = { ...user.profile };
    profile.monthlyMealSubsidies = this.calculateMonthlyMealSubsidies(
      profile.leaveRecords,
      currentYear,
      currentMonth,
    );
    return profile;
  }

  getLeaveRecords(
    userId: string,
    year: number,
    month: number,
  ): LeaveRecord[] {
    const profile = this.getProfile(userId);
    if (!profile) {
      this.logger.warn(`User not found: ${userId}`);
      return [];
    }
    return profile.leaveRecords.filter((r) => {
      const d = new Date(r.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }

  getMonthlyMealSubsidy(
    userId: string,
    year: number,
    month: number,
  ): MonthlyMealSubsidy | null {
    const profile = this.getProfile(userId);
    if (!profile) {
      this.logger.warn(`User not found: ${userId}`);
      return null;
    }
    return (
      profile.monthlyMealSubsidies.find(
        (s) => s.year === year && s.month === month,
      ) ?? null
    );
  }

  calculateMonthlyMealSubsidies(
    leaveRecords: LeaveRecord[],
    currentYear: number,
    currentMonth: number,
  ): MonthlyMealSubsidy[] {
    const result: MonthlyMealSubsidy[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthLeaves = leaveRecords.filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === currentYear && d.getMonth() + 1 === month;
      });

      const fullDayLeaveCount = monthLeaves
        .filter((r) => r.duration >= 1)
        .reduce((sum, r) => sum + r.duration, 0);

      const halfDayLeaveCount = monthLeaves.filter(
        (r) => r.duration === 0.5,
      ).length;

      const totalAmount = DEFAULT_WORKDAYS * DAILY_MEAL_AMOUNT;
      const deductedAmount = Math.round(fullDayLeaveCount * DAILY_MEAL_AMOUNT);
      const payableAmount = totalAmount - deductedAmount;
      const isClaimed = month < currentMonth;

      result.push({
        year: currentYear,
        month,
        totalWorkdays: DEFAULT_WORKDAYS,
        fullDayLeaveCount,
        halfDayLeaveCount,
        dailyAmount: DAILY_MEAL_AMOUNT,
        totalAmount,
        deductedAmount,
        payableAmount,
        isClaimed,
      });
    }

    return result;
  }

  isPersonalQuery(query: string): boolean {
    const lower = query.toLowerCase();

    const firstPerson = /我|我的|本人/;
    const hrKeywords =
      /年假|假期|请假|报销|补贴|考勤|迟到|打卡|加班|调休|福利|体检|培训|晋升|职级|工资|薪资|事假|病假|婚假|产假/;

    if (firstPerson.test(lower) && hrKeywords.test(lower)) {
      return true;
    }

    const quantityPatterns =
      /(?:我|我的).*?(?:还剩|还有|用了|已用|剩余|多少|几天|几小时|多少钱)/;
    if (quantityPatterns.test(lower)) {
      return true;
    }

    const mealSubsidyKeywords = /餐补|食补|饭贴|午餐补贴|餐饮补贴/;
    if (firstPerson.test(lower) && mealSubsidyKeywords.test(lower)) {
      return true;
    }

    const monthKeywords = /这个月|上个月|本月|上月|这几个月|今年/;
    const leaveDayKeywords = /请了几天假|休了几天|请假天数/;
    if (
      firstPerson.test(lower) &&
      monthKeywords.test(lower) &&
      leaveDayKeywords.test(lower)
    ) {
      return true;
    }

    const specificMonthPattern =
      /(?:我|我的).*?(?:1月|2月|3月|4月|5月|6月|7月|8月|9月|10月|11月|12月).*?(?:餐补|食补|饭贴|请假|休假)/;
    if (specificMonthPattern.test(lower)) {
      return true;
    }

    const statusPatterns =
      /(?:我|我的).*?(?:可以|能不能|是否符合|有没有资格|还能|是否可以)/;
    return statusPatterns.test(lower);
  }

  formatForPrompt(profile: UserProfile): string {
    const examMap: Record<string, string> = {
      completed: '已完成',
      scheduled: '已预约',
      not_yet: '未安排',
    };
    const birthdayMap: Record<string, string> = {
      claimed: '已领取',
      unclaimed: '未领取',
    };

    const basePrompt = `## 当前用户个人信息
以下是你（${profile.realName}，${profile.department} ${profile.position}，职级 ${profile.level}）的当前人事数据：

### 年假与请假
- 年假总天数：${String(profile.annualLeaveTotal)} 天
- 已休年假：${String(profile.annualLeaveUsed)} 天
- 剩余年假：${String(profile.annualLeaveRemaining)} 天
- 已休病假：${String(profile.sickLeaveUsed)} 天
- 已休事假：${String(profile.personalLeaveUsed)} 天（全年累计不超过 10 天）

### 报销与补贴
- 本年度报销总额：${String(profile.reimbursementTotal)} 元
- 待审批报销：${String(profile.reimbursementPending)} 元
- 已到账报销：${String(profile.reimbursementApproved)} 元
- 通讯补贴：${String(profile.communicationSubsidy)} 元/月
- 交通补贴：${String(profile.transportSubsidy)} 元/月
- 工作日餐补：${String(profile.mealSubsidy)} 元/月

### 考勤
- 本月迟到次数：${String(profile.lateCountThisMonth)} 次（每月前 3 次免罚）
- 本月忘打卡次数：${String(profile.forgotClockCountThisMonth)} 次（每月允许 2 次补录）
- 加班调休余额：${String(profile.overtimeBalanceHours)} 小时

### 福利
- 培训预算余额：${String(profile.trainingBudgetRemaining)} 元（年度 5000 元）
- 年度体检状态：${examMap[profile.annualExaminationStatus]}
- 生日福利：${birthdayMap[profile.birthdayBenefitStatus]}

### 晋升
- 上次晋升日期：${profile.lastPromotionDate ?? '无'}
- 是否可参加下次晋升评估：${profile.nextEvaluationEligible ? '是' : '否'}
`;

    return (
      basePrompt +
      '\n' +
      this.formatLeaveRecords(profile.leaveRecords) +
      '\n\n' +
      this.formatMealSubsidies(profile.monthlyMealSubsidies)
    );
  }

  private formatLeaveRecords(records: LeaveRecord[]): string {
    if (records.length === 0) {
      return '### 请假记录明细\n本年度暂无请假记录。';
    }

    const typeMap: Record<string, string> = {
      annual: '年假',
      sick: '病假',
      personal: '事假',
      marriage: '婚假',
      maternity: '产假',
    };

    const lines = records.map((r) => {
      const durationText = r.duration === 0.5 ? '半天' : '全天';
      return `- ${r.date}：${typeMap[r.type]}（${durationText}）`;
    });

    return `### 请假记录明细\n本年度共请假 ${String(records.length)} 次：\n${lines.join('\n')}`;
  }

  private formatMealSubsidies(subsidies: MonthlyMealSubsidy[]): string {
    if (subsidies.length === 0) {
      return '### 月度餐补统计\n暂无月度餐补数据。';
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentSubsidy = subsidies.find((s) => s.month === currentMonth);

    const lines = subsidies.map((s) => {
      const status = s.isClaimed ? '已申报' : '未申报';
      const halfDayNote =
        s.halfDayLeaveCount > 0
          ? `（含${String(s.halfDayLeaveCount)}个半天假，不扣餐补）`
          : '';
      return `- ${String(s.month)}月：工作日${String(s.totalWorkdays)}天，请假${String(s.fullDayLeaveCount)}天${halfDayNote}，应发${String(s.totalAmount)}元，扣除${String(s.deductedAmount)}元，实发${String(s.payableAmount)}元【${status}】`;
    });

    let summary = '';
    if (currentSubsidy) {
      summary = `\n\n本月（${String(currentMonth)}月）餐补：实发 ${String(currentSubsidy.payableAmount)} 元，${currentSubsidy.isClaimed ? '已申报' : '未申报'}。`;
    }

    const dailyAmount = String(subsidies[0]?.dailyAmount ?? 30);

    return `### 月度餐补统计\n餐补规则：工作日每天 ${dailyAmount} 元，每月按 22 个工作日计算。全天请假扣除当天餐补，半天请假不扣除。\n\n${lines.join('\n')}${summary}`;
  }

  getAllUsers(): User[] {
    return this.authService.getAllUsers();
  }
}

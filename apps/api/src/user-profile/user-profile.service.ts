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

    const quantityPatterns = /(?:我|我的).*?(?:还剩|还有|用了|已用|剩余|多少|几天|几小时|多少钱)/;
    if (quantityPatterns.test(lower)) {
      return true;
    }

    const statusPatterns = /(?:我|我的).*?(?:可以|能不能|是否符合|有没有资格|还能|是否可以)/;
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

    return `## 当前用户个人信息
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
  }

  getAllUsers(): User[] {
    return this.authService.getAllUsers();
  }
}

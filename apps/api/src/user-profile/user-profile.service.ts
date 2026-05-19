import { Injectable } from '@nestjs/common';

import type { User, UserProfile } from '@/auth/auth.interface';
import { AuthService } from '@/auth/auth.service';
import type { IUserProfileService } from '@/user-profile/user-profile.interface';

@Injectable()
export class UserProfileService implements IUserProfileService {
  constructor(private readonly authService: AuthService) {}

  getProfile(userId: string): UserProfile | null {
    const user = this.authService.getUserById(userId);
    return user?.profile ?? null;
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
    if (statusPatterns.test(lower)) {
      return true;
    }

    return false;
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

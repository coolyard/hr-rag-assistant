import { type FC, useCallback, useEffect, useState } from 'react';

import { client } from '@/api/client';
import { Navbar } from '@/components/Layout/Navbar';
import styles from '@/pages/ProfilePage.module.css';

interface UserProfile {
  realName: string;
  department: string;
  position: string;
  level: string;
  hireDate: string;
  probationEndDate: string;
  isProbation: boolean;
  annualLeaveTotal: number;
  annualLeaveUsed: number;
  annualLeaveRemaining: number;
  sickLeaveUsed: number;
  personalLeaveUsed: number;
  marriageLeaveUsed: number;
  maternityLeaveUsed: number;
  reimbursementTotal: number;
  reimbursementPending: number;
  reimbursementApproved: number;
  reimbursementCount: number;
  communicationSubsidy: number;
  transportSubsidy: number;
  mealSubsidy: number;
  lateCountThisMonth: number;
  forgotClockCountThisMonth: number;
  overtimeBalanceHours: number;
  trainingBudgetRemaining: number;
  annualExaminationStatus: 'completed' | 'scheduled' | 'not_yet';
  birthdayBenefitStatus: 'claimed' | 'unclaimed';
  lastPromotionDate: string | null;
  nextEvaluationEligible: boolean;
}

interface MeResponse {
  id: string;
  username: string;
  role: string;
  displayName: string;
  profile: UserProfile;
}

function formatTenure(hireDate: string): string {
  const hire = new Date(hireDate);
  const now = new Date();
  const years = now.getFullYear() - hire.getFullYear();
  const months = now.getMonth() - hire.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 12) {
    return `${String(totalMonths)} 个月`;
  }
  return `${String(years)} 年 ${String(months >= 0 ? months : months + 12)} 个月`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const examStatusLabel: Record<string, string> = {
  completed: '已完成',
  scheduled: '已预约',
  not_yet: '未安排',
};

const birthdayStatusLabel: Record<string, string> = {
  claimed: '已领取',
  unclaimed: '未领取',
};

export const ProfilePage: FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const response = await client.get<MeResponse>('/me');
      setProfile(response.data.profile);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonLines}>
              <div className={styles.skeletonLineWide} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineShort} />
            </div>
          </div>
          <div className={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonStat} />
                <div className={styles.skeletonStat} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.errorState}>
            <p className={styles.errorText}>加载失败，请刷新重试</p>
            <button className={styles.retryButton} onClick={() => { void fetchProfile(); }} type="button">
              刷新
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.avatar}>{profile.realName.charAt(0)}</div>
          <div className={styles.headerInfo}>
            <h1 className={styles.name}>{profile.realName}</h1>
            <p className={styles.position}>
              {profile.level} · {profile.position}
            </p>
            <p className={styles.department}>{profile.department}</p>
            <p className={styles.hireInfo}>
              入职：{formatDate(profile.hireDate)} · 已入职 {formatTenure(profile.hireDate)}
              {profile.isProbation && <span className={styles.probationTag}>试用期</span>}
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.statCard}>
            <h3 className={styles.cardTitle}>年假统计</h3>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{String(profile.annualLeaveTotal)}</span>
                <span className={styles.statLabel}>总天数</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{String(profile.annualLeaveUsed)}</span>
                <span className={styles.statLabel}>已休</span>
              </div>
              <div className={styles.statItem}>
                <span
                  className={`${styles.statValue} ${profile.annualLeaveRemaining <= 1 ? styles.warningOrange : styles.successGreen}`}
                >
                  {String(profile.annualLeaveRemaining)}
                </span>
                <span className={styles.statLabel}>剩余</span>
              </div>
            </div>
            <div
              className={`${styles.summaryPill} ${profile.annualLeaveRemaining <= 1 ? styles.pillWarning : styles.pillSuccess}`}
            >
              剩余 {String(profile.annualLeaveRemaining)} 天
            </div>
          </div>

          <div className={styles.statCard}>
            <h3 className={styles.cardTitle}>报销统计</h3>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{String(profile.reimbursementTotal)}</span>
                <span className={styles.statLabel}>总额(元)</span>
              </div>
              <div className={styles.statItem}>
                <span className={`${styles.statValue} ${styles.infoBlue}`}>
                  {String(profile.reimbursementPending)}
                </span>
                <span className={styles.statLabel}>待审批</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{String(profile.reimbursementApproved)}</span>
                <span className={styles.statLabel}>已到账</span>
              </div>
            </div>
            <div className={styles.summaryPill}>
              本年度 {String(profile.reimbursementCount)} 笔报销
            </div>
          </div>

          <div className={styles.statCard}>
            <h3 className={styles.cardTitle}>考勤统计</h3>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span
                  className={`${styles.statValue} ${profile.lateCountThisMonth >= 3 ? styles.warningOrange : styles.successGreen}`}
                >
                  {String(profile.lateCountThisMonth)}
                </span>
                <span className={styles.statLabel}>本月迟到</span>
              </div>
              <div className={styles.statItem}>
                <span
                  className={`${styles.statValue} ${profile.forgotClockCountThisMonth >= 2 ? styles.warningRed : styles.successGreen}`}
                >
                  {String(profile.forgotClockCountThisMonth)}
                </span>
                <span className={styles.statLabel}>忘打卡</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{String(profile.overtimeBalanceHours)}</span>
                <span className={styles.statLabel}>调休(h)</span>
              </div>
            </div>
            <div className={styles.summaryPill}>
              本月迟到 {String(profile.lateCountThisMonth)} 次 · 调休 {String(profile.overtimeBalanceHours)}h
            </div>
          </div>

          <div className={styles.statCard}>
            <h3 className={styles.cardTitle}>福利与培训</h3>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span
                  className={`${styles.statValue} ${profile.trainingBudgetRemaining <= 500 ? styles.warningOrange : styles.successGreen}`}
                >
                  {String(profile.trainingBudgetRemaining)}
                </span>
                <span className={styles.statLabel}>培训预算</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {examStatusLabel[profile.annualExaminationStatus]}
                </span>
                <span className={styles.statLabel}>体检</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {birthdayStatusLabel[profile.birthdayBenefitStatus]}
                </span>
                <span className={styles.statLabel}>生日福利</span>
              </div>
            </div>
            <div className={styles.summaryPill}>
              培训预算 {String(profile.trainingBudgetRemaining)}/5000 元
            </div>
          </div>
        </div>

        <div className={styles.detailSection}>
          <h3 className={styles.sectionTitle}>请假记录汇总</h3>
          <div className={styles.detailRow}>
            <div className={styles.detailItem}>
              <span className={styles.detailValue}>{String(profile.sickLeaveUsed)} 天</span>
              <span className={styles.detailLabel}>病假</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailValue}>{String(profile.personalLeaveUsed)} 天</span>
              <span className={styles.detailLabel}>事假</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailValue}>{String(profile.marriageLeaveUsed)} 天</span>
              <span className={styles.detailLabel}>婚假</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailValue}>{String(profile.maternityLeaveUsed)} 天</span>
              <span className={styles.detailLabel}>产假</span>
            </div>
          </div>
        </div>

        <div className={styles.detailSection}>
          <h3 className={styles.sectionTitle}>补贴明细</h3>
          <div className={styles.detailRow}>
            <div className={styles.detailItem}>
              <span className={styles.detailValue}>{String(profile.communicationSubsidy)} 元/月</span>
              <span className={styles.detailLabel}>通讯补贴</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailValue}>{String(profile.transportSubsidy)} 元/月</span>
              <span className={styles.detailLabel}>交通补贴</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailValue}>{String(profile.mealSubsidy)} 元/月</span>
              <span className={styles.detailLabel}>餐补</span>
            </div>
            {profile.lastPromotionDate && (
              <div className={styles.detailItem}>
                <span className={styles.detailValue}>
                  {formatDate(profile.lastPromotionDate)}
                </span>
                <span className={styles.detailLabel}>上次晋升</span>
              </div>
            )}
            <div className={styles.detailItem}>
              <span className={styles.detailValue}>
                {profile.nextEvaluationEligible ? '是' : '否'}
              </span>
              <span className={styles.detailLabel}>下次晋升资格</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

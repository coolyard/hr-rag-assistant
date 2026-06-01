import { type FC, useCallback, useEffect, useState } from 'react';

import { client } from '@/api/client';
import { Navbar } from '@/components/Layout/Navbar';
import styles from '@/pages/ProfilePage.module.css';

interface LeaveRecord {
  date: string;
  type: 'annual' | 'sick' | 'personal' | 'marriage' | 'maternity';
  duration: number;
}

interface MonthlyMealSubsidy {
  year: number;
  month: number;
  totalWorkdays: number;
  fullDayLeaveCount: number;
  halfDayLeaveCount: number;
  dailyAmount: number;
  totalAmount: number;
  deductedAmount: number;
  payableAmount: number;
  isClaimed: boolean;
  isFuture: boolean;
}

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
  leaveRecords: LeaveRecord[];
  monthlyMealSubsidies: MonthlyMealSubsidy[];
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

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
  marriage: '婚假',
  maternity: '产假',
};

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function generateCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  return cells;
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const ProfilePage: FC = () => {
  const now = new Date();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

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

  useEffect(() => {
    const d = new Date();
    const srvYear = d.getFullYear();
    const srvMonth = d.getMonth() + 1;
    const maxMonth =
      selectedYear > srvYear ? 0 : selectedYear === srvYear ? srvMonth : 12;
    if (selectedMonth > maxMonth && maxMonth > 0) {
      setSelectedMonth(maxMonth);
    }
  }, [selectedYear, selectedMonth]);

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

  const calendarDays = generateCalendarDays(selectedYear, selectedMonth);

  const selectedMonthLeaveRecords = profile.leaveRecords.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
  });

  const selectedMonthSubsidy = profile.monthlyMealSubsidies.find(
    (s) => s.year === selectedYear && s.month === selectedMonth,
  ) ?? null;

  const leaveMapByDate = new Map<string, LeaveRecord>();
  for (const r of profile.leaveRecords) {
    leaveMapByDate.set(r.date, r);
  }

  const availableYears = [
    ...new Set([
      now.getFullYear(),
      ...profile.leaveRecords.map((r) => new Date(r.date).getFullYear()),
    ]),
  ].sort();

  const yearSubsidies = profile.monthlyMealSubsidies.filter(
    (s) => s.year === selectedYear,
  );

  const serverYear = now.getFullYear();
  const serverMonth = now.getMonth() + 1;

  const maxSelectableMonth =
    selectedYear > serverYear ? 0 : selectedYear === serverYear ? serverMonth : 12;

  const claimedTotal = yearSubsidies
    .filter((s) => s.isClaimed)
    .reduce((sum, s) => sum + s.payableAmount, 0);

  const unclaimedTotal = yearSubsidies
    .filter((s) => !s.isClaimed && !s.isFuture)
    .reduce((sum, s) => sum + s.payableAmount, 0);

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

        {/* Calendar + Monthly Meal Subsidy */}
        <div className={styles.calendarSection}>
          <div className={styles.calendarHeader}>
            <h3 className={styles.sectionTitle}>请假日历与餐补统计</h3>
            <div className={styles.monthSelector}>
              <select
                className={styles.yearSelect}
                value={selectedYear}
                onChange={(e) => { setSelectedYear(Number(e.target.value)); }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{String(y)} 年</option>
                ))}
              </select>
              <select
                className={styles.monthSelect}
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(Number(e.target.value)); }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1)
                  .filter((m) => m <= maxSelectableMonth)
                  .map((m) => (
                    <option key={m} value={m}>{String(m)} 月</option>
                  ))}
              </select>
            </div>
          </div>

          <div className={styles.calendarLayout}>
            {/* Calendar */}
            <div className={styles.calendar}>
              <div className={styles.calendarGrid}>
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className={styles.dayHeader}>
                    {label}
                  </div>
                ))}
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={idx} className={styles.calendarCell} />;
                  }
                  const dateStr = formatDateStr(selectedYear, selectedMonth, day);
                  const record = leaveMapByDate.get(dateStr);
                  const isToday =
                    day === now.getDate() &&
                    selectedMonth === now.getMonth() + 1 &&
                    selectedYear === now.getFullYear();
                  const isHalfDay = record?.duration === 0.5;
                  return (
                    <div
                      key={idx}
                      className={`${styles.calendarCell} ${isToday ? styles.todayCell : ''}`}
                      data-tooltip={
                        record
                          ? `${dateStr}：${LEAVE_TYPE_LABEL[record.type]}（${isHalfDay ? '半天' : '全天'}）`
                          : undefined
                      }
                    >
                      <span
                        className={`${styles.dayNumber} ${record ? styles.leaveDay : ''} ${record ? styles[`leaveType${record.type.charAt(0).toUpperCase() + record.type.slice(1)}`] : ''}`}
                      >
                        {day}
                      </span>
                      {record && (
                        <span
                          className={`${styles.leaveIndicator} ${isHalfDay ? styles.halfDayIndicator : styles.fullDayIndicator}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className={styles.legend}>
                {(['annual', 'sick', 'personal', 'marriage', 'maternity'] as const).map((type) => (
                  <span key={type} className={styles.legendItem}>
                    <span
                      className={`${styles.legendDot} ${styles[`leaveType${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}
                    />
                    {LEAVE_TYPE_LABEL[type]}
                  </span>
                ))}
                <span className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.halfDayLegend}`} />
                  半天假
                </span>
              </div>
            </div>

            {/* Monthly Meal Subsidy Card */}
            <div className={styles.mealCard}>
              <h4 className={styles.mealCardTitle}>
                {String(selectedYear)} 年 {String(selectedMonth)} 月 餐补统计
              </h4>
              {selectedMonthSubsidy && !selectedMonthSubsidy.isFuture ? (
                <>
                  <div className={styles.mealStats}>
                    <div className={styles.mealStatItem}>
                      <span className={styles.mealStatLabel}>应发金额</span>
                      <span className={styles.mealStatValueSecondary}>
                        {String(selectedMonthSubsidy.totalAmount)} 元
                      </span>
                    </div>
                    <div className={styles.mealStatItem}>
                      <span className={styles.mealStatLabel}>扣除金额</span>
                      <span
                        className={`${styles.mealStatValue} ${selectedMonthSubsidy.deductedAmount > 0 ? styles.mealDeducted : ''}`}
                      >
                        -{String(selectedMonthSubsidy.deductedAmount)} 元
                      </span>
                    </div>
                    <div className={styles.mealStatItem}>
                      <span className={styles.mealStatLabel}>实发金额</span>
                      <span className={`${styles.mealStatValue} ${styles.mealPayable}`}>
                        {String(selectedMonthSubsidy.payableAmount)} 元
                      </span>
                    </div>
                  </div>
                  <div className={styles.mealClaimStatus}>
                    状态：
                    {selectedMonthSubsidy.isClaimed ? (
                      <span className={styles.claimClaimed}>已申报</span>
                    ) : (
                      <span className={styles.claimUnclaimed}>未申报</span>
                    )}
                  </div>
                  <div className={styles.mealLeaveDetail}>
                    {selectedMonthLeaveRecords.length === 0 ? (
                      <p className={styles.mealEmptyNote}>
                        本月无请假记录，餐补全额发放 {String(selectedMonthSubsidy.totalAmount)} 元
                      </p>
                    ) : (
                      <ul className={styles.mealLeaveList}>
                        {selectedMonthLeaveRecords.map((r) => (
                          <li key={r.date} className={styles.mealLeaveItem}>
                            <span className={styles.mealLeaveDate}>{r.date}</span>
                            <span className={styles.mealLeaveType}>
                              {LEAVE_TYPE_LABEL[r.type]}
                            </span>
                            <span className={styles.mealLeaveDuration}>
                              {r.duration === 0.5 ? '半天' : '全天'}
                            </span>
                            <span
                              className={
                                r.duration >= 1 ? styles.mealLeaveDeductTag : styles.mealLeaveNoDeductTag
                              }
                            >
                              {r.duration >= 1 ? '扣款 30 元' : '不扣款'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : selectedMonthSubsidy?.isFuture ? (
                <p className={styles.mealEmptyNote}>
                  {String(selectedYear)} 年 {String(selectedMonth)} 月尚未到来，暂无餐补数据
                </p>
              ) : (
                <p className={styles.mealEmptyNote}>
                  {String(selectedYear)} 年 {String(selectedMonth)} 月暂无餐补数据
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Yearly Meal Subsidy Summary */}
        <div className={styles.yearlySection}>
          <div className={styles.calendarHeader}>
            <h3 className={styles.sectionTitle}>餐补汇总</h3>
            <select
              className={styles.yearSelect}
              value={selectedYear}
              onChange={(e) => { setSelectedYear(Number(e.target.value)); }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{String(y)} 年</option>
              ))}
            </select>
          </div>
          <div className={styles.yearlyGrid}>
            {yearSubsidies.map((s) =>
              s.isFuture ? (
                <div
                  key={s.month}
                  className={`${styles.yearlyCard} ${styles.yearlyCardDisabled}`}
                >
                  <span className={styles.yearlyMonth}>{String(s.month)}月</span>
                  <span className={styles.yearlyAmount}>—</span>
                </div>
              ) : (
                <button
                  key={s.month}
                  type="button"
                  className={`${styles.yearlyCard} ${s.month === selectedMonth ? styles.yearlyCardActive : ''}`}
                  onClick={() => { setSelectedMonth(s.month); }}
                >
                  <span className={styles.yearlyMonth}>{String(s.month)}月</span>
                  <span className={styles.yearlyAmount}>{String(s.payableAmount)}</span>
                  <span
                    className={`${styles.yearlyStatus} ${s.isClaimed ? styles.yearlyClaimed : styles.yearlyUnclaimed}`}
                  >
                    {s.isClaimed ? '已申报' : '未申报'}
                  </span>
                </button>
              ),
            )}
          </div>
          <div className={styles.yearlyTotals}>
            <span className={styles.yearlyTotalItem}>
              已申报总额：<span className={styles.yearlyTotalValue}>{String(claimedTotal)} 元</span>
            </span>
            <span className={styles.yearlyTotalItem}>
              未申报总额：<span className={styles.yearlyTotalValue}>{String(unclaimedTotal)} 元</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

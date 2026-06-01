export type UserRole = 'employee' | 'hr';

export type LeaveType = 'annual' | 'sick' | 'personal' | 'marriage' | 'maternity';

export interface LeaveRecord {
  date: string;
  type: LeaveType;
  duration: number;
}

export interface MonthlyMealSubsidy {
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

export interface UserProfile {
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

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  profile: UserProfile;
}

export interface UserPayload {
  sub: string;
  username: string;
  role: UserRole;
  displayName: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
    displayName: string;
  };
}

export const EMPLOYEE_PROFILE: UserProfile = {
  realName: '李明',
  department: '技术研发部',
  position: '前端开发工程师',
  level: 'P5',
  hireDate: '2024-03-15',
  probationEndDate: '2024-06-15',
  isProbation: false,
  annualLeaveTotal: 20,
  annualLeaveUsed: 14.5,
  annualLeaveRemaining: 5.5,
  sickLeaveUsed: 5,
  personalLeaveUsed: 3,
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
  leaveRecords: [
    { date: '2025-01-10', type: 'annual', duration: 1 },
    { date: '2025-02-18', type: 'sick', duration: 0.5 },
    { date: '2025-03-05', type: 'annual', duration: 1 },
    { date: '2025-04-15', type: 'personal', duration: 1 },
    { date: '2025-04-22', type: 'personal', duration: 0.5 },
    { date: '2025-05-20', type: 'annual', duration: 0.5 },
    { date: '2025-06-03', type: 'sick', duration: 1 },
    { date: '2025-08-11', type: 'annual', duration: 1 },
    { date: '2025-08-12', type: 'annual', duration: 1 },
    { date: '2025-09-25', type: 'sick', duration: 0.5 },
    { date: '2025-10-08', type: 'annual', duration: 1 },
    { date: '2025-10-09', type: 'annual', duration: 1 },
    { date: '2025-10-10', type: 'annual', duration: 1 },
    { date: '2025-10-11', type: 'annual', duration: 1 },
    { date: '2025-11-14', type: 'personal', duration: 1 },
    { date: '2026-01-26', type: 'annual', duration: 1 },
    { date: '2026-01-27', type: 'annual', duration: 1 },
    { date: '2026-01-28', type: 'annual', duration: 1 },
    { date: '2026-02-02', type: 'annual', duration: 1 },
    { date: '2026-02-03', type: 'annual', duration: 1 },
    { date: '2026-03-16', type: 'sick', duration: 1 },
    { date: '2026-04-08', type: 'personal', duration: 0.5 },
    { date: '2026-05-05', type: 'annual', duration: 1 },
    { date: '2026-05-19', type: 'sick', duration: 1 },
    { date: '2026-06-01', type: 'sick', duration: 1 },
  ],
  monthlyMealSubsidies: [],
};

export const HR_PROFILE: UserProfile = {
  realName: '李华',
  department: '人力资源部',
  position: 'HRBP',
  level: 'P6',
  hireDate: '2021-01-10',
  probationEndDate: '2021-04-10',
  isProbation: false,
  annualLeaveTotal: 20,
  annualLeaveUsed: 13.5,
  annualLeaveRemaining: 6.5,
  sickLeaveUsed: 4,
  personalLeaveUsed: 5,
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
  leaveRecords: [
    { date: '2025-01-08', type: 'annual', duration: 1 },
    { date: '2025-02-14', type: 'annual', duration: 1 },
    { date: '2025-03-20', type: 'sick', duration: 0.5 },
    { date: '2025-04-10', type: 'personal', duration: 1 },
    { date: '2025-05-06', type: 'annual', duration: 1 },
    { date: '2025-05-28', type: 'annual', duration: 1 },
    { date: '2025-06-12', type: 'sick', duration: 1 },
    { date: '2025-07-15', type: 'annual', duration: 1 },
    { date: '2025-09-08', type: 'annual', duration: 1 },
    { date: '2025-09-09', type: 'annual', duration: 1 },
    { date: '2025-10-13', type: 'personal', duration: 1 },
    { date: '2025-10-14', type: 'personal', duration: 1 },
    { date: '2025-10-15', type: 'personal', duration: 1 },
    { date: '2025-11-28', type: 'sick', duration: 0.5 },
    { date: '2025-12-22', type: 'annual', duration: 1 },
    { date: '2026-01-19', type: 'annual', duration: 1 },
    { date: '2026-01-20', type: 'annual', duration: 1 },
    { date: '2026-01-21', type: 'annual', duration: 1 },
    { date: '2026-01-22', type: 'annual', duration: 1 },
    { date: '2026-03-09', type: 'sick', duration: 1 },
    { date: '2026-03-10', type: 'sick', duration: 1 },
    { date: '2026-04-06', type: 'personal', duration: 1 },
    { date: '2026-05-12', type: 'annual', duration: 0.5 },
    { date: '2026-06-01', type: 'annual', duration: 1 },
  ],
  monthlyMealSubsidies: [],
};

export const PRESET_USERS: User[] = [
  {
    id: 'user-1',
    username: 'employee',
    password: '123456',
    role: 'employee',
    displayName: '员工',
    profile: EMPLOYEE_PROFILE,
  },
  {
    id: 'user-2',
    username: 'hr',
    password: '123456',
    role: 'hr',
    displayName: 'HR专员',
    profile: HR_PROFILE,
  },
];

export type UserRole = 'employee' | 'hr';

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

export const HR_PROFILE: UserProfile = {
  realName: '李华',
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

import type {
  LeaveRecord,
  MonthlyMealSubsidy,
  User,
  UserProfile,
} from '@/auth/auth.interface';

export interface IUserProfileService {
  getProfile(userId: string): UserProfile | null;
  isPersonalQuery(query: string): boolean;
  formatForPrompt(profile: UserProfile): string;
  getAllUsers(): User[];
  getLeaveRecords(
    userId: string,
    year: number,
    month: number,
  ): LeaveRecord[];
  getMonthlyMealSubsidy(
    userId: string,
    year: number,
    month: number,
  ): MonthlyMealSubsidy | null;
  calculateMonthlyMealSubsidies(
    leaveRecords: LeaveRecord[],
    currentYear: number,
  ): MonthlyMealSubsidy[];
}

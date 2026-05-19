import type { User, UserProfile } from '@/auth/auth.interface';

export interface IUserProfileService {
  getProfile(userId: string): UserProfile | null;
  isPersonalQuery(query: string): boolean;
  formatForPrompt(profile: UserProfile): string;
  getAllUsers(): User[];
}

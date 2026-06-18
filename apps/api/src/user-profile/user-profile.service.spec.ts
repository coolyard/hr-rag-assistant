import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { AuthService } from '@/auth/auth.service';
import { UserProfileService } from '@/user-profile/user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
  });

  describe('isPersonalQuery', () => {
    it('包含"我"的查询应返回 true', () => {
      expect(service.isPersonalQuery('我还有多少天年假')).toBe(true);
      expect(service.isPersonalQuery('我的年假')).toBe(true);
    });

    it('不包含个人信息的查询应返回 false', () => {
      expect(service.isPersonalQuery('年假怎么请')).toBe(false);
      expect(service.isPersonalQuery('报销流程')).toBe(false);
    });

    it('包含"本人"的查询应返回 true', () => {
      expect(service.isPersonalQuery('本人的年假剩余多少')).toBe(true);
    });

    it('包含餐补关键词的个人查询应返回 true', () => {
      expect(service.isPersonalQuery('我的餐补多少钱')).toBe(true);
    });

    it('包含月份+请假的个人查询应返回 true', () => {
      expect(service.isPersonalQuery('我这个月请了几天假')).toBe(true);
    });
  });

  describe('getProfile', () => {
    it('应返回已知用户的 profile', () => {
      const profile = service.getProfile('user-1');
      expect(profile).not.toBeNull();
      expect(profile?.realName).toBeTruthy();
    });

    it('未知用户应返回 null', () => {
      const profile = service.getProfile('unknown-user');
      expect(profile).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('应返回所有预置用户', () => {
      const users = service.getAllUsers();
      expect(users).toHaveLength(2);
    });
  });

  describe('formatForPrompt', () => {
    it('应包含用户名和部门', () => {
      const profile = service.getProfile('user-1');
      if (profile) {
        const prompt = service.formatForPrompt(profile);
        expect(prompt).toContain(profile.realName);
        expect(prompt).toContain(profile.department);
      }
    });

    it('应包含年假统计信息', () => {
      const profile = service.getProfile('user-1');
      if (profile) {
        const prompt = service.formatForPrompt(profile);
        expect(prompt).toContain('年假总天数');
        expect(prompt).toContain('剩余年假');
      }
    });
  });
});

/* eslint-disable @typescript-eslint/unbound-method */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { AuthService } from '@/auth/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest
              .fn()
              .mockReturnValue({ username: 'employee', sub: 'user-1', role: 'employee' }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('validateUser', () => {
    it('有效凭证应返回 User 对象', () => {
      const user = service.validateUser('employee', '123456');
      expect(user).not.toBeNull();
      expect(user?.username).toBe('employee');
    });

    it('错误密码应返回 null', () => {
      const user = service.validateUser('employee', 'wrong');
      expect(user).toBeNull();
    });

    it('不存在用户应返回 null', () => {
      const user = service.validateUser('nonexist', '123456');
      expect(user).toBeNull();
    });
  });

  describe('login', () => {
    it('有效用户应返回 access_token', () => {
      const result = service.login({ username: 'employee', password: '123456' });
      expect(result.access_token).toBe('mock-token');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('无效用户应抛出 UnauthorizedException', () => {
      expect(() => {
        service.login({ username: 'employee', password: 'wrong' });
      }).toThrow(UnauthorizedException);
    });
  });

  describe('getUserById', () => {
    it('有效 ID 应返回用户', () => {
      const user = service.getUserById('user-1');
      expect(user).not.toBeNull();
      expect(user?.username).toBe('employee');
    });

    it('无效 ID 应返回 null', () => {
      const user = service.getUserById('nonexist');
      expect(user).toBeNull();
    });
  });
});

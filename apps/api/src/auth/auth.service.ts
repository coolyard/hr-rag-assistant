import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { LoginRequest, LoginResponse, User, UserPayload } from '@/auth/auth.interface';
import { PRESET_USERS } from '@/auth/auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly users = new Map<string, User>();

  constructor(private readonly jwtService: JwtService) {
    for (const user of PRESET_USERS) {
      this.users.set(user.username, user);
    }
    this.logger.log(`Initialized ${String(this.users.size)} preset users`);
  }

  validateUser(username: string, password: string): User | null {
    const user = this.users.get(username);
    if (!user) {
      return null;
    }
    if (user.password !== password) {
      return null;
    }
    return user;
  }

  login(request: LoginRequest): LoginResponse {
    const user = this.validateUser(request.username, request.password);
    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: '账号或密码错误',
        error: 'Unauthorized',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const payload: UserPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    };

    const token = this.jwtService.sign(payload);

    this.logger.log(`User ${user.username} logged in successfully`);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
      },
    };
  }

  getUserById(id: string): User | null {
    for (const user of this.users.values()) {
      if (user.id === id) {
        return user;
      }
    }
    return null;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}

import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import type { LoginRequest, LoginResponse, UserPayload } from '@/auth/auth.interface';
import { AuthService } from '@/auth/auth.service';
import { Public } from '@/auth/public.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginRequest): LoginResponse {
    return this.authService.login(body);
  }
}

@Controller('api')
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  getProfile(@Req() req: Request) {
    const payload = req.user as UserPayload;
    const user = this.authService.getUserById(payload.sub);
    if (!user) {
      return { error: 'User not found' };
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      profile: user.profile,
    };
  }
}

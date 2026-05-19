import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { UserPayload } from '@/auth/auth.interface';
import { IS_PUBLIC_KEY } from '@/auth/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: '未登录',
        error: 'Unauthorized',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    try {
      const payload = this.jwtService.verify<UserPayload>(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException({
        statusCode: 401,
        message: '登录已过期，请重新登录',
        error: 'Unauthorized',
        code: 'TOKEN_EXPIRED',
      });
    }
  }
}

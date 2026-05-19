import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { UserPayload, UserRole } from '@/auth/auth.interface';
import { ROLES_KEY } from '@/auth/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: UserPayload }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        statusCode: 403,
        message: '权限不足',
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        message: '权限不足',
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
    }

    return true;
  }
}

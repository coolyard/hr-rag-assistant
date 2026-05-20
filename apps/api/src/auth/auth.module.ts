import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { AuthController, MeController } from '@/auth/auth.controller';
import { AuthGuard } from '@/auth/auth.guard';
import { AuthService } from '@/auth/auth.service';

const JWT_SECRET = process.env.JWT_SECRET ?? 'hr-rag-assistant-secret';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

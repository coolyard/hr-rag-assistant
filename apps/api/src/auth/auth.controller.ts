import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import type { LoginRequest, LoginResponse, UserPayload } from '@/auth/auth.interface';
import { AuthService } from '@/auth/auth.service';
import { Public } from '@/auth/public.decorator';
import { UserProfileService } from '@/user-profile/user-profile.service';

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
  constructor(
    private readonly authService: AuthService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Get('me')
  getProfile(@Req() req: Request) {
    const payload = req.user as UserPayload;
    const user = this.authService.getUserById(payload.sub);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const profile = this.userProfileService.getProfile(user.id);
    if (!profile) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      profile,
    };
  }

  @Get('me/leave-records')
  getLeaveRecords(
    @Req() req: Request,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const payload = req.user as UserPayload;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const resolvedYear = year ? Number(year) : currentYear;
    const resolvedMonth = month ? Number(month) : currentMonth;

    if (
      isNaN(resolvedYear) ||
      isNaN(resolvedMonth) ||
      resolvedMonth < 1 ||
      resolvedMonth > 12
    ) {
      throw new HttpException(
        'Invalid year or month parameter',
        HttpStatus.BAD_REQUEST,
      );
    }

    const records = this.userProfileService.getLeaveRecords(
      payload.sub,
      resolvedYear,
      resolvedMonth,
    );

    if (!this.userProfileService.getProfile(payload.sub)) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const fullDayCount = records
      .filter((r) => r.duration >= 1)
      .reduce((sum, r) => sum + r.duration, 0);
    const halfDayCount = records.filter((r) => r.duration === 0.5).length;
    const totalDeduction = fullDayCount * 30;

    return {
      year: resolvedYear,
      month: resolvedMonth,
      records,
      summary: {
        fullDayCount,
        halfDayCount,
        totalDeduction,
      },
    };
  }

  @Get('me/meal-subsidy')
  getMealSubsidy(
    @Req() req: Request,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const payload = req.user as UserPayload;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const resolvedYear = year ? Number(year) : currentYear;
    const resolvedMonth = month ? Number(month) : currentMonth;

    if (
      isNaN(resolvedYear) ||
      isNaN(resolvedMonth) ||
      resolvedMonth < 1 ||
      resolvedMonth > 12
    ) {
      throw new HttpException(
        'Invalid year or month parameter',
        HttpStatus.BAD_REQUEST,
      );
    }

    const subsidy = this.userProfileService.getMonthlyMealSubsidy(
      payload.sub,
      resolvedYear,
      resolvedMonth,
    );

    if (!subsidy) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return subsidy;
  }
}

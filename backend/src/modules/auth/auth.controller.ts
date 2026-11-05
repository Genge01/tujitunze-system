
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';

import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './jwt.strategy';

import {
  ACCESS_TOKEN_COOKIE_NAME,
  getAccessTokenCookieOptions,
} from './auth-cookie.constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticate a user and create a database-backed session.
   * The session ID is included in the JWT by AuthService.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() body: LoginDto,
              @Req() request: Request,
              @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body, {
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });

    response.cookie(
      ACCESS_TOKEN_COOKIE_NAME,
      result.accessToken,
      getAccessTokenCookieOptions(),
    );

    return result;
  }

  /**
   * Revoke the current authenticated database session
   * and clear the authentication cookie.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
               @Res({ passthrough: true }) response: Response,
  ) {
    try {
      return await this.authService.logout(user.sessionId);
    } finally {
      response.clearCookie(
        ACCESS_TOKEN_COOKIE_NAME,
        getAccessTokenCookieOptions(),
      );
    }
  }

  /**
   * Request password-reset instructions through email or phone.
   */
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body);
  }

  /**
   * Verify the password-reset OTP sent to the user's phone.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('verify-reset-otp')
  verifyResetOtp(@Body() body: VerifyResetOtpDto) {
    return this.authService.verifyResetOtp(body);
  }

  /**
   * Request a new password-reset OTP.
   */
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('resend-reset-otp')
  resendResetOtp(@Body() body: ForgotPasswordDto) {
    return this.authService.resendResetOtp(body);
  }

  /**
   * Reset the user's password using a valid reset token.
   */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  /**
   * Return the currently authenticated user's information.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

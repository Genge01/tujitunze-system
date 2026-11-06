import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

import { MembersService } from './members.service';
import { RegisterDto } from './dto/register.dto';
import { AddPhoneNumberDto } from './dto/add-phone-number.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSavingConsentDto } from './dto/update-saving-consent.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // 5/min per IP — registration is unauthenticated and NIDA/email-spam
  // sensitive.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.membersService.register(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.getProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateProfileDto,
  ) {
    return this.membersService.updateProfile(user.userId, body);
  }

  @Get('telecom-operators')
  async telecomOperators() {
    return this.membersService.listTelecomOperators();
  }

  @Get('banks')
  async banks() {
    return this.membersService.listBanks();
  }

  @Get('regions')
  async regions() {
    return this.membersService.listRegions();
  }

  @Get('districts')
  async districts(@Query('regionId', ParseIntPipe) regionId: number) {
    return this.membersService.listDistrictsByRegion(regionId);
  }

  // 10/min per IP — guards against linking-spam even though this route is
  // authenticated.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Post('phone-numbers')
  async addPhoneNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddPhoneNumberDto,
    @Req() request: Request,
  ) {
    return this.membersService.addPhoneNumber(user.userId, body, request.ip);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Post('bank-accounts')
  async addBankAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddBankAccountDto,
    @Req() request: Request,
  ) {
    return this.membersService.addBankAccount(user.userId, body, request.ip);
  }

  // Unlink, not a hard delete — see MembersService.removePhoneNumber.
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Delete('phone-numbers/:id')
  async removePhoneNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.membersService.removePhoneNumber(user.userId, id, request.ip);
  }

  // Unlink, not a hard delete — see MembersService.removeBankAccount.
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Delete('bank-accounts/:id')
  async removeBankAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.membersService.removeBankAccount(user.userId, id, request.ip);
  }

  // The other half of removePhoneNumber/removeBankAccount above — see
  // MembersService.reactivatePhoneNumber.
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Patch('phone-numbers/:id/reactivate')
  async reactivatePhoneNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.membersService.reactivatePhoneNumber(
      user.userId,
      id,
      request.ip,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Patch('bank-accounts/:id/reactivate')
  async reactivateBankAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.membersService.reactivateBankAccount(
      user.userId,
      id,
      request.ip,
    );
  }

  // Real hard delete — only reachable once already unlinked and only if
  // there's no financial history against it. See
  // MembersService.deletePhoneNumberPermanently.
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Delete('phone-numbers/:id/permanent')
  async deletePhoneNumberPermanently(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.membersService.deletePhoneNumberPermanently(
      user.userId,
      id,
      request.ip,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Delete('bank-accounts/:id/permanent')
  async deleteBankAccountPermanently(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.membersService.deleteBankAccountPermanently(
      user.userId,
      id,
      request.ip,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Patch('me/password')
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordDto,
    @Req() request: Request,
  ) {
    return this.membersService.changePassword(user.userId, body, request.ip);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Get('membership')
  async membership(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.getMembership(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('wallet:manage')
  @Get('savings-summary')
  async savingsSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.getSavingsSummary(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('wallet:manage')
  @Get('saving-consent')
  async savingConsent(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.getSavingConsent(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('wallet:manage')
  @Patch('saving-consent')
  async updateSavingConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateSavingConsentDto,
    @Req() request: Request,
  ) {
    return this.membersService.updateSavingConsent(
      user.userId,
      body,
      request.ip,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('profile:manage')
  @Patch('phone-numbers/:id/primary')
  async setPrimaryPhoneNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.membersService.setPrimaryPhoneNumber(
      user.userId,
      id,
      request.ip,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('member-insurance:view')
  @Get('insurance')
  async insurance(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.listInsurance(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('member-insurance:view')
  @Get('insurance-allocations-summary')
  async insuranceAllocationsSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.getInsuranceAllocationsSummary(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('member-insurance:view')
  @Get('claims')
  async claims(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.listClaims(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('Member')
  @Permissions('onboarding:manage')
  @Get('verifications')
  async verifications(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.listVerifications(user.userId);
  }
}

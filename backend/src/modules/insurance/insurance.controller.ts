import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { InsuranceService } from './insurance.service';
import { UpdateClaimStatusDto } from './dto/update-claim-status.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
@Controller('insurance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Permissions('reports:view')

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.insuranceService.getDashboard(user.userId);
  }

  // Consolidated dashboard payload — contributions (+ per-operator/
  // per-bank breakdown), allocations, member coverage, claims, and
  // recent activity in one call. The Insurance dashboard page fetches
  // this instead of separately calling GET /insurance/dashboard and
  // GET /insurance/contributions/summary (both kept, unchanged, for any
  // other/future consumer that wants just one narrower slice).
  @Permissions('reports:view')
  @Get('dashboard/summary')
  async getDashboardSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.insuranceService.getDashboardSummary(user.userId);
  }

  @Permissions('claims:review')

  @Get('claims')
  async listClaims(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.insuranceService.listClaims(user.userId, status);
  }

  @Permissions('claims:review')
  @Patch('claims/:id/status')
  async updateClaimStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClaimStatusDto,
    @Req() request: Request,
  ) {
    return this.insuranceService.updateClaimStatus(
      user.userId,
      id,
      dto,
      request.ip,
    );
  }

  @Permissions('reports:view')
  @Get('settlements')
  async listSettlements(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.insuranceService.listSettlements(user.userId, status);
  }

  @Permissions('reports:view')
  @Get('contributions/summary')
  async getContributionsSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.insuranceService.getContributionsSummary(user.userId);
  }

  @Permissions('reports:view')
  @Get('allocations')
  async listAllocations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status: string | undefined,
    @Query('channel') channel: 'AIRTIME' | 'BANK_TRANSFER' | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.insuranceService.listAllocations(
      user.userId,
      { status, channel, dateFrom, dateTo },
      page,
      pageSize,
    );
  }

  @Permissions('reports:view')
  @Get('allocations/:id/trace')
  async getAllocationTrace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.insuranceService.getAllocationTrace(user.userId, id);
  }

  @Permissions('reports:view')
  @Get('reports')
  async getReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.insuranceService.getReports(user.userId, period);
  }
}

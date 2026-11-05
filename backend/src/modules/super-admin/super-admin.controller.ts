import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
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

import { SuperAdminService } from './super-admin.service';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

type ManagedAccountRole =
  | 'Member'
  | 'Admin'
  | 'Bank'
  | 'Telecom'
  | 'Insurance';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
  ) {}

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  @Get('dashboard')
  async getDashboard() {
    return this.superAdminService.getDashboard();
  }

  // --------------------------------------------------
  // INSTITUTION MANAGEMENT
  // --------------------------------------------------

  @Get('institutions/banks')
  async listBanks(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.superAdminService.listInstitutions(
      'banks',
      search,
      status,
      page,
      pageSize,
    );
  }

  @Get('institutions/telecom-operators')
  async listTelecomOperators(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.superAdminService.listInstitutions(
      'telecom-operators',
      search,
      status,
      page,
      pageSize,
    );
  }

  @Get('institutions/insurance-providers')
  async listInsuranceProviders(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.superAdminService.listInstitutions(
      'insurance-providers',
      search,
      status,
      page,
      pageSize,
    );
  }

  // --------------------------------------------------
  // LEGACY ADMINISTRATOR MANAGEMENT
  // Preserve compatibility with the existing dashboard.
  // --------------------------------------------------

  @Get('administrators')
  async listAdministrators() {
    const result =
      await this.superAdminService.listAdministrators();

    // The existing dashboard expects an array.
    return result.data;
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('administrators')
  async createAdministrator(
    @Body() body: CreateAdministratorDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminService.createAdministrator(
      body,
      actor.userId,
      request.ip,
    );
  }

  @Patch('administrators/:userId/deactivate')
  async deactivateAdministrator(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminService.deactivateAdministrator(
      userId,
      actor.userId,
      request.ip,
      'Admin',
    );
  }

  @Patch('administrators/:userId/activate')
  async activateAdministrator(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminService.activateAdministrator(
      userId,
      actor.userId,
      request.ip,
      'Admin',
    );
  }

  @Delete('administrators/:userId')
  async deleteAdministrator(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminService.deleteAdministrator(
      userId,
      actor.userId,
      request.ip,
      'Admin',
    );
  }

  // --------------------------------------------------
  // ACCOUNT LISTS
  // --------------------------------------------------

  @Get('users/members')
  async listMembers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.superAdminService.listUsersByRole(
      'Member',
      search,
      status,
      page,
      pageSize,
    );
  }

  @Get('users/administrators')
  async listNormalAdministrators(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.superAdminService.listUsersByRole(
      'Admin',
      search,
      status,
      page,
      pageSize,
    );
  }

  @Get('users/bank-staff')
  async listBankStaff(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.superAdminService.listUsersByRole(
      'Bank',
      search,
      status,
      page,
      pageSize,
    );
  }

  @Get('users/telecom-staff')
  async listTelecomStaff(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.superAdminService.listUsersByRole(
      'Telecom',
      search,
      status,
      page,
      pageSize,
    );
  }

  @Get('users/insurance-staff')
  async listInsuranceStaff(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.superAdminService.listUsersByRole(
      'Insurance',
      search,
      status,
      page,
      pageSize,
    );
  }

  // --------------------------------------------------
  // GENERIC ACCOUNT MANAGEMENT
  // --------------------------------------------------

  private resolveManagedRole(
    role: string,
  ): ManagedAccountRole {
    const roleMap: Record<string, ManagedAccountRole> = {
      members: 'Member',
      administrators: 'Admin',
      'bank-staff': 'Bank',
      'telecom-staff': 'Telecom',
      'insurance-staff': 'Insurance',
    };

    const resolvedRole = roleMap[role];

    if (!resolvedRole) {
      throw new BadRequestException(
        'Invalid account category.',
      );
    }

    return resolvedRole;
  }

  @Patch('users/:role/:userId/deactivate')
  async deactivateManagedAccount(
    @Param('role') role: string,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const expectedRole = this.resolveManagedRole(role);

    return this.superAdminService.deactivateAdministrator(
      userId,
      actor.userId,
      request.ip,
      expectedRole,
    );
  }

  @Patch('users/:role/:userId/activate')
  async activateManagedAccount(
    @Param('role') role: string,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const expectedRole = this.resolveManagedRole(role);

    return this.superAdminService.activateAdministrator(
      userId,
      actor.userId,
      request.ip,
      expectedRole,
    );
  }

  @Delete('users/:role/:userId')
  async deleteManagedAccount(
    @Param('role') role: string,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const expectedRole = this.resolveManagedRole(role);

    return this.superAdminService.deleteAdministrator(
      userId,
      actor.userId,
      request.ip,
      expectedRole,
    );
  }

  // --------------------------------------------------
  // TENANTS
  // --------------------------------------------------

  @Get('tenants')
  async listTenants() {
    return this.superAdminService.listTenants();
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

import { SuperAdminRolesService } from './super-admin-roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

import { PermissionsGuard } from '../auth/guards/permissions.guard';

// 30/min per IP per route — matches the class of gap flagged for
// /super-admin/administrators; generous enough for normal admin use
// while still bounding a compromised/scripted Super-admin session.
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Super-admin')
export class SuperAdminRolesController {
  constructor(
    private readonly superAdminRolesService: SuperAdminRolesService,
  ) {}

  @Permissions('roles:manage')

  @Get('roles')
  async listRoles() {
    return this.superAdminRolesService.listRoles();
  }

  @Permissions('roles:manage')

  @Post('roles')
  async createRole(
    @Body() body: CreateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminRolesService.createRole(
      body,
      actor.userId,
      request.ip,
    );
  }

  @Permissions('roles:manage')

  @Patch('roles/:id')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminRolesService.updateRole(
      id,
      body,
      actor.userId,
      request.ip,
    );
  }

  @Permissions('roles:manage')

  @Delete('roles/:id')
  async deleteRole(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminRolesService.deleteRole(id, actor.userId, request.ip);
  }

  @Permissions('permissions:manage')

  @Get('permissions')
  async listPermissions() {
    return this.superAdminRolesService.listPermissions();
  }

  @Permissions('permissions:manage')

  @Put('roles/:id/permissions')
  async updateRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRolePermissionsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminRolesService.updateRolePermissions(
      id,
      body,
      actor.userId,
      request.ip,
    );
  }
}

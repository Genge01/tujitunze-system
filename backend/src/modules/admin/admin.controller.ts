import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AdminService } from './admin.service';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

import { PermissionsGuard } from '../auth/guards/permissions.guard';
@Controller('admin/members')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Permissions('members:manage')

  @Get()
  async list() {
    return this.adminService.listMembers();
  }

  @Permissions('members:manage')

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getMember(id);
  }

  @Permissions('members:manage')

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMemberStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.adminService.updateMemberStatus(
      id,
      body,
      admin.userId,
      request.ip,
    );
  }
}

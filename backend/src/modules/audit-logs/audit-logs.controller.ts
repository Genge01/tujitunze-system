import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuditLogsService } from './audit-logs.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)

@Roles('Admin', 'Super-admin')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Permissions('audit-logs:view')

  @Get()
  async list() {
    return this.auditLogsService.list();
  }
}

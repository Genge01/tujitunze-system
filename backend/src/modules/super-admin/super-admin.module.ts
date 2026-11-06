import { Module } from '@nestjs/common';

import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminRolesController } from './super-admin-roles.controller';
import { SuperAdminRolesService } from './super-admin-roles.service';
import { SuperAdminSavingRulesController } from './super-admin-saving-rules.controller';
import { SuperAdminSavingRulesService } from './super-admin-saving-rules.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { AuthorizationModule } from '../auth/authorization.module';

@Module({
  imports: [
    AuthorizationModule,AuditLogsModule],
  controllers: [
    SuperAdminController,
    SuperAdminRolesController,
    SuperAdminSavingRulesController,
  ],
  providers: [
    SuperAdminService,
    SuperAdminRolesService,
    SuperAdminSavingRulesService,
  ],
})
export class SuperAdminModule {}

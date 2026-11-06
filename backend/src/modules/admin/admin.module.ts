import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminReconciliationController } from './admin-reconciliation.controller';
import { AdminReconciliationService } from './admin-reconciliation.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { AuthorizationModule } from '../auth/authorization.module';

@Module({
  imports: [
    AuthorizationModule,AuditLogsModule],
  controllers: [
    AdminController,
    AdminDashboardController,
    AdminReconciliationController,
  ],
  providers: [AdminService, AdminDashboardService, AdminReconciliationService],
})
export class AdminModule {}

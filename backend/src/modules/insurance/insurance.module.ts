import { Module } from '@nestjs/common';

import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { AuthorizationModule } from '../auth/authorization.module';

@Module({
  imports: [
    AuthorizationModule,AuditLogsModule],
  controllers: [InsuranceController],
  providers: [InsuranceService],
})
export class InsuranceModule {}

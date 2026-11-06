import { Module } from '@nestjs/common';

import { BankController } from './bank.controller';
import { BankWebhooksController } from './bank-webhooks.controller';
import { BankService } from './bank.service';
import { BankApiKeyGuard } from './guards/bank-api-key.guard';
import { BankWebhookSignatureGuard } from './guards/bank-webhook-signature.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletsModule } from '../wallets/wallets.module';

import { AuthorizationModule } from '../auth/authorization.module';

@Module({
  imports: [
    AuthorizationModule,AuditLogsModule, NotificationsModule, WalletsModule],
  controllers: [BankController, BankWebhooksController],
  providers: [BankService, BankApiKeyGuard, BankWebhookSignatureGuard],
})
export class BankModule {}

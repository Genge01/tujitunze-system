import { Module } from '@nestjs/common';

import { TelecomController } from './telecom.controller';
import { TelecomWebhooksController } from './telecom-webhooks.controller';
import { TelecomService } from './telecom.service';
import { TelecomApiKeyGuard } from './guards/telecom-api-key.guard';
import { TelecomWebhookSignatureGuard } from './guards/telecom-webhook-signature.guard';
import { VodacomDiagnosticController } from './vodacom/vodacom-diagnostic.controller';
import { VodacomSessionKeyService } from './vodacom/vodacom-session-key.service';
import { VodacomC2BService } from './vodacom/vodacom-c2b.service';
import { VodacomMpesaHttpService } from './vodacom/vodacom-mpesa-http.service';
import { VodacomSessionCacheService } from './vodacom/vodacom-session-cache.service';
import { VodacomTransactionRecorder } from './vodacom/vodacom-transaction-recorder.service';
import { VodacomProviderService } from './providers/vodacom/vodacom-provider.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { WalletsModule } from '../wallets/wallets.module';

import { AuthorizationModule } from '../auth/authorization.module';

@Module({
  imports: [
    AuthorizationModule,AuditLogsModule, WalletsModule],
  controllers: [
    TelecomController,
    TelecomWebhooksController,
    VodacomDiagnosticController,
  ],
  providers: [
    TelecomService,
    TelecomApiKeyGuard,
    TelecomWebhookSignatureGuard,
    VodacomSessionKeyService,
    VodacomMpesaHttpService,
    VodacomSessionCacheService,
    VodacomTransactionRecorder,
    VodacomC2BService,
    VodacomProviderService,
  ],
})
export class TelecomModule {}

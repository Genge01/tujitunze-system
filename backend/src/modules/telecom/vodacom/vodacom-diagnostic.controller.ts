import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { VodacomSessionKeyService } from './vodacom-session-key.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

// Internal TUJITUNZE diagnostic — verifies TUJITUNZE's OWN backend can
// reach Vodacom's sandbox and obtain a SessionKey. This is not a
// Telecom-partner-facing route (unlike TelecomController, scoped to a
// partner operator's own tenant data via users.telecom_operator_id) —
// it's an Admin-only internal connectivity check, hence a separate
// controller with its own RBAC rather than a method added to
// TelecomController.
//
// Never returns the SessionKey itself — only safe, non-sensitive
// diagnostic fields.
@Controller('telecom/vodacom')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Admin')
export class VodacomDiagnosticController {
  constructor(
    private readonly sessionKeyService: VodacomSessionKeyService,
    private readonly configService: ConfigService,
  ) {}

  @Permissions('settings:manage')

  @Get('test-connection')
  async testConnection() {
    const market =
      this.configService.get<string>('VODACOM_MPESA_MARKET') ?? null;
    const environment =
      this.configService.get<string>('VODACOM_MPESA_ENV') ?? 'sandbox';

    const result = await this.sessionKeyService.generateSession();

    if (result.success) {
      return {
        success: true,
        provider: 'Vodacom M-Pesa',
        market,
        environment,
        responseCode: result.responseCode,
        message: 'Vodacom M-Pesa SessionKey generated successfully',
      };
    }

    return {
      success: false,
      provider: 'Vodacom M-Pesa',
      market,
      environment,
      responseCode: result.responseCode,
      errorKind: result.errorKind,
      message: result.message,
    };
  }
}

import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Header,
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

import { TelecomService } from './telecom.service';
import { UpdateOperatorContactDto } from './dto/update-operator-contact.dto';
import { ConfigureWebhookDto } from './dto/configure-webhook.dto';
import { UploadReconciliationDto } from './dto/upload-reconciliation.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { VodacomC2BService } from './vodacom/vodacom-c2b.service';
import { ReverseMpesaTransactionDto } from './dto/reverse-mpesa-transaction.dto';

import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
@Controller('telecom')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Telecom')
export class TelecomController {
  constructor(
    private readonly telecomService: TelecomService,
    private readonly vodacomC2BService: VodacomC2BService,
  ) {}

  @Permissions('telecom-dashboard:view')

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.telecomService.getDashboard(user.userId);
  }

  @Permissions('settings:manage')

  @Get('operator')
  async getOperator(@CurrentUser() user: AuthenticatedUser) {
    return this.telecomService.getOperatorProfile(user.userId);
  }

  @Permissions('settings:manage')
  @Patch('operator/contact')
  async updateOperatorContact(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateOperatorContactDto,
    @Req() request: Request,
  ) {
    return this.telecomService.updateOperatorContact(
      user.userId,
      body,
      request.ip,
    );
  }

  // Tight limit — this issues a fresh credential every call.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Permissions('settings:manage')
  @Post('operator/api-key/regenerate')
  async regenerateApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.telecomService.regenerateApiKey(user.userId, request.ip);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Permissions('settings:manage')
  @Post('operator/webhook')
  async configureWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ConfigureWebhookDto,
    @Req() request: Request,
  ) {
    return this.telecomService.configureWebhook(user.userId, body, request.ip);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Permissions('settings:manage')
  @Post('operator/connection-test')
  async testConnection(@CurrentUser() user: AuthenticatedUser) {
    return this.telecomService.testConnection(user.userId);
  }

  @Permissions('customers:manage')

  @Get('members')
  async listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.telecomService.listMembers(user.userId, page, pageSize);
  }

  // 20/min — a manual per-collection recording action, not a bulk feed;
  // matches the generosity of other write endpoints in this controller
  // while still bounding abuse.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Permissions('transactions:manage')
  @Post('contributions')
  async recordContribution(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RecordContributionDto,
    @Req() request: Request,
  ) {
    return this.telecomService.recordContribution(
      user.userId,
      body,
      request.ip,
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Permissions('transactions:manage')
  @Patch('contributions/:id/reverse')
  async reverseContribution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.telecomService.reverseContribution(user.userId, id, request.ip);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Permissions('transactions:manage')
  @Patch('contributions/:id/fail')
  async markContributionFailed(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.telecomService.markContributionFailed(
      user.userId,
      id,
      request.ip,
    );
  }

  @Permissions('transactions:manage')
  @Get('contributions')
  async listContributions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.telecomService.listContributions(
      user.userId,
      status,
      page,
      pageSize,
    );
  }

  @Permissions('transactions:manage')
  @Get('contributions/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="contributions.csv"')
  async exportContributions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status: string | undefined,
  ) {
    return this.telecomService.exportContributionsCsv(user.userId, status);
  }

  @Permissions('settings:manage')
  @Get('contribution-rules')
  async listContributionRules() {
    return this.telecomService.listContributionRules();
  }

  // Principle 1 — staff-facing read side. The webhook itself
  // (POST /telecom/webhooks/resource-conversion) is operator-
  // authenticated (TelecomApiKeyGuard) and lives on
  // TelecomWebhooksController, same split as the contribution webhook.
  @Permissions('payments:manage')
  @Get('resource-conversions/summary')
  async getResourceConversionsSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.telecomService.getResourceConversionsSummary(user.userId);
  }

  @Permissions('payments:manage')
  @Get('resource-conversions')
  async listResourceConversions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status: string | undefined,
    @Query('resourceType') resourceType: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.telecomService.listResourceConversions(
      user.userId,
      { status, resourceType },
      page,
      pageSize,
    );
  }

  @Permissions('payments:manage')
  @Get('resource-conversions/:id')
  async getResourceConversion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.telecomService.getResourceConversion(user.userId, id);
  }

  // Principle 2 — staff-facing read side, telecom-authenticated intake
  // only (see outgoing-transaction-diversion.types.ts).
  @Permissions('payments:manage')
  @Get('outgoing-diversions/summary')
  async getOutgoingDiversionsSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.telecomService.getOutgoingDiversionsSummary(user.userId);
  }

  @Permissions('payments:manage')
  @Get('outgoing-diversions')
  async listOutgoingDiversions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status: string | undefined,
    @Query('transactionType') transactionType: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.telecomService.listOutgoingDiversions(
      user.userId,
      { status, transactionType },
      page,
      pageSize,
    );
  }

  @Permissions('reconciliation:manage')

  @Post('reconciliation/runs')
  async createReconciliationRun(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UploadReconciliationDto,
  ) {
    return this.telecomService.createReconciliationRun(user.userId, body);
  }

  @Permissions('reconciliation:manage')
  @Get('reconciliation/runs')
  async listReconciliationRuns(@CurrentUser() user: AuthenticatedUser) {
    return this.telecomService.listReconciliationRuns(user.userId);
  }

  @Permissions('reconciliation:manage')
  @Get('reconciliation/runs/:id')
  async getReconciliationRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.telecomService.getReconciliationRun(user.userId, id);
  }

  @Permissions('reports:view')

  @Get('reports')
  async getReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.telecomService.getReports(user.userId, period);
  }

  @Permissions('audit-logs:view')

  @Get('activity-logs')
  async listActivityLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.telecomService.listActivityLogs(user.userId);
  }

  @Permissions('audit-logs:view')
  @Get('api-access-logs')
  async listApiAccessLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.telecomService.listApiAccessLogs(user.userId);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Permissions('transactions:manage')
  @Post('mpesa/transactions/:id/query')
  async queryMpesaTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vodacomC2BService.queryTransactionStatus(user.userId, id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Permissions('payments:manage')
  @Post('mpesa/transactions/:id/reversal')
  async reverseMpesaTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReverseMpesaTransactionDto,
    @Req() request: Request,
  ) {
    return this.vodacomC2BService.reverseTransaction(
      user.userId,
      id,
      body,
      request.ip,
    );
  }
}

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

import { BankService } from './bank.service';
import { UpdateBankContactDto } from './dto/update-bank-contact.dto';
import { ConfigureWebhookDto } from './dto/configure-webhook.dto';
import { UploadReconciliationDto } from './dto/upload-reconciliation.dto';
import { FundTransferDto } from './dto/fund-transfer.dto';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
@Controller('bank')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Bank')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Permissions('reports:view')

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.bankService.getDashboard(user.userId);
  }

  @Permissions('settings:manage')

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.bankService.getBankProfile(user.userId);
  }

  @Permissions('settings:manage')
  @Patch('profile/contact')
  async updateContact(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateBankContactDto,
    @Req() request: Request,
  ) {
    return this.bankService.updateBankContact(user.userId, body, request.ip);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Permissions('settings:manage')
  @Post('profile/api-key/regenerate')
  async regenerateApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.bankService.regenerateApiKey(user.userId, request.ip);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Permissions('settings:manage')
  @Post('profile/webhook')
  async configureWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ConfigureWebhookDto,
    @Req() request: Request,
  ) {
    return this.bankService.configureWebhook(user.userId, body, request.ip);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Permissions('settings:manage')
  @Post('profile/connection-test')
  async testConnection(@CurrentUser() user: AuthenticatedUser) {
    return this.bankService.testConnection(user.userId);
  }

  @Permissions('accounts:manage')

  @Get('branches')
  async listBranches(@CurrentUser() user: AuthenticatedUser) {
    return this.bankService.listBranches(user.userId);
  }

  @Permissions('accounts:manage')
  @Get('fund-accounts')
  async listFundAccounts(@CurrentUser() user: AuthenticatedUser) {
    return this.bankService.listFundAccounts(user.userId);
  }

  @Permissions('transfers:manage')

  @Post('fund-accounts/:type/transfer')
  async createFundTransfer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: string,
    @Body() body: FundTransferDto,
    @Req() request: Request,
  ) {
    return this.bankService.createFundTransfer(
      user.userId,
      type,
      body,
      request.ip,
    );
  }

  @Permissions('transfers:manage')
  @Get('fund-accounts/:type/transfers')
  async listFundTransfers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.bankService.listFundTransfers(
      user.userId,
      type,
      page,
      pageSize,
    );
  }

  // 20/min — a manual per-collection recording action, not a bulk feed.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Permissions('transactions:manage')
  @Post('contributions')
  async recordContribution(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RecordContributionDto,
    @Req() request: Request,
  ) {
    return this.bankService.recordContribution(user.userId, body, request.ip);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Permissions('transactions:manage')
  @Patch('contributions/:id/reverse')
  async reverseContribution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.bankService.reverseContribution(user.userId, id, request.ip);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Permissions('transactions:manage')
  @Patch('contributions/:id/fail')
  async markContributionFailed(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.bankService.markContributionFailed(user.userId, id, request.ip);
  }

  @Permissions('transactions:manage')
  @Get('transactions')
  async listTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type: string | undefined,
    @Query('status') status: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.bankService.listTransactions(
      user.userId,
      type,
      status,
      page,
      pageSize,
    );
  }

  @Permissions('transactions:manage')
  @Get('transactions/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="transactions.csv"')
  async exportTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type: string | undefined,
    @Query('status') status: string | undefined,
  ) {
    return this.bankService.exportTransactionsCsv(user.userId, type, status);
  }

  @Permissions('transactions:manage')
  @Patch('transactions/:id/status')
  async updateTransactionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransactionStatusDto,
    @Req() request: Request,
  ) {
    return this.bankService.updateTransactionStatus(
      user.userId,
      id,
      body,
      request.ip,
    );
  }

  @Permissions('transactions:manage')
  @Post('settlements')
  async createSettlement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateSettlementDto,
    @Req() request: Request,
  ) {
    return this.bankService.createSettlement(user.userId, body, request.ip);
  }

  @Permissions('transactions:manage')
  @Patch('settlements/:id/complete')
  async completeSettlement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.bankService.completeSettlement(user.userId, id, request.ip);
  }

  @Permissions('transactions:manage')
  @Get('settlements')
  async listSettlements(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status: string | undefined,
    @Query('counterpartyType') counterpartyType: string | undefined,
  ) {
    return this.bankService.listSettlements(
      user.userId,
      status,
      counterpartyType,
    );
  }

  @Permissions('reconciliation:manage')

  @Post('reconciliation/runs')
  async createReconciliationRun(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UploadReconciliationDto,
  ) {
    return this.bankService.createReconciliationRun(user.userId, body);
  }

  @Permissions('reconciliation:manage')
  @Get('reconciliation/runs')
  async listReconciliationRuns(@CurrentUser() user: AuthenticatedUser) {
    return this.bankService.listReconciliationRuns(user.userId);
  }

  @Permissions('reconciliation:manage')
  @Get('reconciliation/runs/:id')
  async getReconciliationRun(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bankService.getReconciliationRun(user.userId, id);
  }

  @Permissions('reports:view')
  @Get('reports')
  async getReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.bankService.getReports(user.userId, period);
  }

  @Permissions('audit-logs:view')

  @Get('activity-logs')
  async listActivityLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.bankService.listActivityLogs(user.userId);
  }

  @Permissions('audit-logs:view')
  @Get('api-access-logs')
  async listApiAccessLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.bankService.listApiAccessLogs(user.userId);
  }
}

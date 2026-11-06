import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { WalletsService } from './wallets.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

// Read-only from the Member side: the Health Wallet balance only moves
// via deductions from linked telecom/bank accounts (Telecom's
// resource-conversion/outgoing-diversion webhooks, Bank's contribution
// flow) and payments to insurers — never a member-initiated top-up or
// withdrawal, so no write endpoints live here.
@Controller('members/wallet')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Member')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Permissions('wallet:manage')

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    return this.walletsService.getWallet(user.userId);
  }

  @Permissions('wallet:manage')
  @Get('transactions')
  async transactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.walletsService.listTransactions(user.userId, page, pageSize);
  }
}

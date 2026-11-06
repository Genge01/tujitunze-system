import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AdminReconciliationService } from './admin-reconciliation.service';
import { ReconciliationCheckDto } from './dto/reconciliation-check.dto';
import { CreateReconciliationRunDto } from './dto/create-reconciliation-run.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

// STEP 7: Admin-facing financial reconciliation —
//   EXTERNAL TRANSACTION -> TUJITUNZE CONTRIBUTION -> INSURANCE ALLOCATION
// Cross-channel (AIRTIME + BANK_TRANSFER in one place), distinct from the
// existing per-operator/per-bank self-service reconciliation under
// /telecom/reconciliation and /bank/reconciliation.
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
@Controller('admin/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Admin')
export class AdminReconciliationController {
  constructor(
    private readonly adminReconciliationService: AdminReconciliationService,
  ) {}

  // Ad-hoc, unpersisted: answers the seven questions for one external
  // transaction on demand, without creating a run record.
  @Permissions('reconciliation:manage')
  @Post('check')
  async checkSingle(@Body() body: ReconciliationCheckDto) {
    return this.adminReconciliationService.checkSingle(body);
  }

  @Permissions('reconciliation:manage')
  @Post('runs')
  async createRun(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateReconciliationRunDto,
    @Req() request: Request,
  ) {
    return this.adminReconciliationService.createRun(
      user.userId,
      body,
      request.ip,
    );
  }

  @Permissions('reconciliation:manage')
  @Get('runs')
  async listRuns() {
    return this.adminReconciliationService.listRuns();
  }

  @Permissions('reconciliation:manage')
  @Get('runs/:id')
  async getRun(@Param('id', ParseIntPipe) id: number) {
    return this.adminReconciliationService.getRun(id);
  }
}

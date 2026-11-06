import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

import { SuperAdminSavingRulesService } from './super-admin-saving-rules.service';
import { CreateSavingRuleDto } from './dto/create-saving-rule.dto';
import { UpdateSavingRuleDto } from './dto/update-saving-rule.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

import { PermissionsGuard } from '../auth/guards/permissions.guard';

// Same throttle/guard shape as SuperAdminRolesController — configures
// the saving-rate rows the two new telecom webhooks (resource
// conversion, outgoing-transaction diversion) read at request time.
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('Super-admin')
export class SuperAdminSavingRulesController {
  constructor(
    private readonly superAdminSavingRulesService: SuperAdminSavingRulesService,
  ) {}

  @Permissions('settings:manage')

  @Get('saving-rules')
  async listSavingRules() {
    return this.superAdminSavingRulesService.listSavingRules();
  }

  @Permissions('settings:manage')

  @Post('saving-rules')
  async createSavingRule(
    @Body() body: CreateSavingRuleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminSavingRulesService.createSavingRule(
      body,
      actor.userId,
      request.ip,
    );
  }

  @Permissions('settings:manage')

  @Patch('saving-rules/:id')
  async updateSavingRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSavingRuleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.superAdminSavingRulesService.updateSavingRule(
      id,
      body,
      actor.userId,
      request.ip,
    );
  }
}

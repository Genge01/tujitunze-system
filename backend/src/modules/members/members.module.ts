import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { PhoneNumber } from './entities/phone-number.entity';
import { MemberBankAccount } from './entities/bank-account.entity';

import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { AuthorizationModule } from '../auth/authorization.module';

@Module({
  imports: [
    AuthorizationModule,
    TypeOrmModule.forFeature([User, PhoneNumber, MemberBankAccount]),
    AuditLogsModule,
    NotificationsModule,
  ],

  controllers: [MembersController],

  providers: [MembersService],

  exports: [MembersService],
})
export class MembersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

import { AuthorizationModule } from '../auth/authorization.module';

@Module({
  imports: [
    AuthorizationModule,TypeOrmModule.forFeature([Notification])],

  controllers: [NotificationsController],

  providers: [NotificationsService],

  exports: [NotificationsService],
})
export class NotificationsModule {}

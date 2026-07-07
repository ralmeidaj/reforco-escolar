import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { Notification } from './notification.entity';
import { Announcement } from './announcement.entity';
import { Task } from '../tasks/task.entity';
import { Attendance } from '../attendance/attendance.entity';
import { User } from '../auth/user.entity';
import { MessagesService } from './messages.service';
import { NotificationsService } from './notifications.service';
import { AnnouncementsService } from './announcements.service';
import { CommunicationCronService } from './communication-cron.service';
import { CommunicationController } from './communication.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Notification, Announcement, Task, Attendance, User])],
  providers: [MessagesService, NotificationsService, AnnouncementsService, CommunicationCronService],
  controllers: [CommunicationController],
  exports: [NotificationsService],
})
export class CommunicationModule {}

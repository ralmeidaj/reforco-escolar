import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './room.entity';
import { RoomAssignment } from './room-assignment.entity';
import { RoomCheckin } from './room-checkin.entity';
import { RoomSchedule } from './room-schedule.entity';
import { RoomScheduleTeacher } from './room-schedule-teacher.entity';
import { User } from '../auth/user.entity';
import { Session } from '../scheduling/session.entity';
import { Attendance } from '../attendance/attendance.entity';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { KioskController } from './kiosk.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomAssignment, RoomCheckin, RoomSchedule, RoomScheduleTeacher, User, Session, Attendance])],
  controllers: [RoomsController, KioskController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}

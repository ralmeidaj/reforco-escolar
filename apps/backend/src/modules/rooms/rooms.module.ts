import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './room.entity';
import { RoomCheckin } from './room-checkin.entity';
import { User } from '../auth/user.entity';
import { Session } from '../scheduling/session.entity';
import { Attendance } from '../attendance/attendance.entity';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { KioskController } from './kiosk.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomCheckin, User, Session, Attendance])],
  controllers: [RoomsController, KioskController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}

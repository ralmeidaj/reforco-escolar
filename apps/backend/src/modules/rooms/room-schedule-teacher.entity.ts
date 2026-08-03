import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { RoomSchedule } from './room-schedule.entity';
import { User } from '../auth/user.entity';

@Entity('room_schedule_teachers')
@Index(['scheduleId', 'teacherId'], { unique: true })
export class RoomScheduleTeacher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'schedule_id' })
  scheduleId: string;

  @ManyToOne(() => RoomSchedule, (s) => s.teachers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: RoomSchedule;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;
}

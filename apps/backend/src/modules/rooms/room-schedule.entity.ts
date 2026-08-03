import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Room } from './room.entity';
import { Subject } from '../subjects/subject.entity';
import { RoomScheduleTeacher } from './room-schedule-teacher.entity';

export type Shift = 'manhã' | 'tarde' | 'noite';

@Entity('room_schedules')
@Index(['tenantId', 'roomId', 'dayOfWeek', 'shift'], { unique: true })
export class RoomSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek: number;

  @Column({ type: 'varchar', length: 10 })
  shift: Shift;

  @Column({ name: 'subject_id', nullable: true, type: 'uuid' })
  subjectId: string | null;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject | null;

  @OneToMany(() => RoomScheduleTeacher, (t) => t.schedule, { cascade: true, eager: true })
  teachers: RoomScheduleTeacher[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { Subject } from '../subjects/subject.entity';
import { Room } from '../rooms/room.entity';
import { AvailabilitySlot } from './availability-slot.entity';

export type SessionStatus = 'agendada' | 'confirmada' | 'realizada' | 'cancelada';
export type SessionChannel = 'presencial' | 'online';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'room_id', nullable: true, type: 'uuid' })
  roomId: string | null;

  @ManyToOne(() => Room, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'room_id' })
  room: Room | null;

  @Column({ name: 'slot_id', nullable: true, type: 'uuid' })
  slotId: string | null;

  @ManyToOne(() => AvailabilitySlot, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'slot_id' })
  slot: AvailabilitySlot | null;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'duration_minutes', default: 60 })
  durationMinutes: number;

  @Column({ default: 'agendada' })
  status: SessionStatus;

  @Column({ default: 'presencial' })
  channel: SessionChannel;

  @Column({ name: 'meet_link', type: 'varchar', nullable: true })
  meetLink: string | null;

  @Column({ name: 'cancel_reason', type: 'varchar', nullable: true })
  cancelReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

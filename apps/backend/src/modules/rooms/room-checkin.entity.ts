import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Room } from './room.entity';

@Entity('room_checkins')
export class RoomCheckin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'student_id' })
  studentId: string;

  @CreateDateColumn({ name: 'checkin_at', type: 'timestamptz' })
  checkinAt: Date;

  @Column({ name: 'checkout_at', type: 'timestamptz', nullable: true })
  checkoutAt: Date | null;
}

import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { Session } from '../scheduling/session.entity';

export type AttendanceStatus = 'presente' | 'ausente' | 'justificado';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'session_id' }) sessionId: string;
  @ManyToOne(() => Session, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'session_id' }) session: Session;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ default: 'presente' }) status: AttendanceStatus;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

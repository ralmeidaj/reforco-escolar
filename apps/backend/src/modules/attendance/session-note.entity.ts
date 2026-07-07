import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { Session } from '../scheduling/session.entity';

@Entity('session_notes')
export class SessionNote {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'session_id' }) sessionId: string;
  @ManyToOne(() => Session, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'session_id' }) session: Session;
  @Column({ name: 'teacher_id' }) teacherId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'teacher_id' }) teacher: User;
  @Column({ type: 'text' }) content: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

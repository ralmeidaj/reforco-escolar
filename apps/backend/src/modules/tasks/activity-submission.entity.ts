import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { Task } from './task.entity';

@Entity('activity_submissions')
export class ActivitySubmission {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'task_id' }) taskId: string;
  @ManyToOne(() => Task, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'task_id' }) task: Task;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'file_url' }) fileUrl: string;
  @Column({ name: 'file_type', type: 'varchar', nullable: true }) fileType: string | null;
  @Column({ type: 'text', nullable: true }) comment: string | null;
  @CreateDateColumn() createdAt: Date;
}

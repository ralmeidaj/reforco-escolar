import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';

@Entity('school_task_captures')
export class SchoolTaskCapture {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'image_url' }) imageUrl: string;
  @Column({ type: 'varchar', nullable: true }) subject: string | null;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate: string | null;
  @Column({ name: 'ai_raw_response', type: 'jsonb', nullable: true }) aiRawResponse: object | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

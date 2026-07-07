import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { Plan } from './plan.entity';

@Entity('student_plans')
export class StudentPlan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'plan_id' }) planId: string;
  @ManyToOne(() => Plan, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'plan_id' }) plan: Plan;
  @Column({ name: 'lessons_total' }) lessonsTotal: number;
  @Column({ name: 'lessons_used', default: 0 }) lessonsUsed: number;
  @Column({ name: 'enrolled_at', type: 'timestamptz' }) enrolledAt: Date;
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true }) expiresAt: Date | null;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

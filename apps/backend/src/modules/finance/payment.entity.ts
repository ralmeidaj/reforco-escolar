import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { StudentPlan } from './student-plan.entity';

export type PaymentStatus = 'pendente' | 'pago' | 'cancelado';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'student_plan_id', type: 'uuid', nullable: true }) studentPlanId: string | null;
  @ManyToOne(() => StudentPlan, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'student_plan_id' }) studentPlan: StudentPlan | null;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) amount: number;
  @Column({ default: 'pendente' }) status: PaymentStatus;
  @Column({ type: 'varchar', nullable: true }) method: string | null;
  @Column({ name: 'external_ref', type: 'varchar', nullable: true }) externalRef: string | null;
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true }) paidAt: Date | null;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

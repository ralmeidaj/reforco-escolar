import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';

@Entity('student_grades')
export class StudentGrade {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'recorded_by' }) recordedBy: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'recorded_by' }) recorder: User;
  @Column() subject: string;
  @Column({ type: 'numeric', precision: 4, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) } })
  value: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

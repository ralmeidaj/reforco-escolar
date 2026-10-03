import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { Subject } from '../subjects/subject.entity';

@Entity('student_grades')
export class StudentGrade {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'recorded_by' }) recordedBy: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'recorded_by' }) recorder: User;
  // nome da disciplina no momento do registro (mantido mesmo se a disciplina for renomeada/excluída depois)
  @Column() subject: string;
  @Column({ name: 'subject_id', nullable: true, type: 'uuid' }) subjectId: string | null;
  @ManyToOne(() => Subject, { onDelete: 'SET NULL' }) @JoinColumn({ name: 'subject_id' }) subjectEntity: Subject | null;
  @Column() unidade: string;
  @Column({ type: 'numeric', precision: 4, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) } })
  value: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

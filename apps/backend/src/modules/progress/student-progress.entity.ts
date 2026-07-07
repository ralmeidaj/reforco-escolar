import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { Subject } from '../subjects/subject.entity';

export type ProgressLevel = 'iniciante' | 'basico' | 'intermediario' | 'avancado';

@Entity('student_progress')
export class StudentProgress {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'subject_id' }) subjectId: string;
  @ManyToOne(() => Subject, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'subject_id' }) subject: Subject;
  @Column({ default: 'iniciante' }) level: ProgressLevel;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @UpdateDateColumn() updatedAt: Date;
}

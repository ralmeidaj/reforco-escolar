import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { Subject } from '../subjects/subject.entity';

export type TaskType = 'padrao' | 'trabalho' | 'eureka' | 'trilha';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'teacher_id' }) teacherId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'teacher_id' }) teacher: User;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'subject_id' }) subjectId: string;
  @ManyToOne(() => Subject, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'subject_id' }) subject: Subject;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ default: 'padrao' }) type: TaskType;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate: string | null;
  @Column({ default: false }) done: boolean;
  @Column({ name: 'done_at', type: 'timestamp', nullable: true }) doneAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

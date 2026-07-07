import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { Subject } from '../subjects/subject.entity';
import { Session } from '../scheduling/session.entity';

@Entity('study_logs')
export class StudyLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'session_id', type: 'uuid', nullable: true }) sessionId: string | null;
  @ManyToOne(() => Session, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'session_id' }) session: Session | null;
  @Column({ name: 'subject_id' }) subjectId: string;
  @ManyToOne(() => Subject, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'subject_id' }) subject: Subject;
  @Column() topic: string;
  @Column({ name: 'pages_read', default: 0 }) pagesRead: number;
  @Column({ name: 'studied_at', type: 'date' }) studiedAt: string;
  @CreateDateColumn() createdAt: Date;
}

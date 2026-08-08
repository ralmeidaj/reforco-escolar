import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';

export interface ActivityCorrectionQuestion {
  number: string;
  studentAnswer: string;
  status: 'correct' | 'wrong' | 'partial';
  feedback: string;
}

@Entity('activity_corrections')
export class ActivityCorrection {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'student_id' }) studentId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'student_id' }) student: User;
  @Column({ name: 'created_by' }) createdBy: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'created_by' }) creator: User;
  @Column() subject: string;
  @Column({ name: 'grade_level', type: 'varchar', nullable: true }) gradeLevel: string | null;
  @Column({ name: 'image_url' }) imageUrl: string;
  @Column({ type: 'varchar', nullable: true }) score: string | null;
  @Column({ type: 'jsonb', nullable: true }) questions: ActivityCorrectionQuestion[] | null;
  @Column({ type: 'text', nullable: true }) summary: string | null;
  @Column({ name: 'voice_orientation', type: 'text', nullable: true }) voiceOrientation: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

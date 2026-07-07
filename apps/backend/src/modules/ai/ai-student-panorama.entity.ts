import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('ai_student_panoramas')
@Index(['tenantId', 'studentId', 'subjectId'], { unique: true })
export class AiStudentPanorama {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'student_id' }) studentId: string;
  @Column({ name: 'subject_id', type: 'uuid', nullable: true }) subjectId: string | null;
  @Column({ type: 'text', array: true, default: [] }) strengths: string[];
  @Column({ name: 'needs_review', type: 'text', array: true, default: [] }) needsReview: string[];
  @Column({ name: 'never_studied', type: 'text', array: true, default: [] }) neverStudied: string[];
  @Column({ type: 'varchar', nullable: true }) level: string | null;
  @Column({ type: 'text', nullable: true }) summary: string | null;
  @Column({ name: 'generated_at' }) generatedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

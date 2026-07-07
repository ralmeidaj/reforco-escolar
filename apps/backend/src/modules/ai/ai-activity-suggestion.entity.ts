import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type AiSuggestionType   = 'quiz' | 'exercicio' | 'desafio';
export type AiSuggestionStatus = 'pending_review' | 'approved' | 'rejected';

@Entity('ai_activity_suggestions')
export class AiActivitySuggestion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'student_id' }) studentId: string;
  @Column({ name: 'subject_id' }) subjectId: string;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text' }) content: string;
  @Column({ default: 'exercicio' }) type: AiSuggestionType;
  @Column({ default: 'pending_review' }) status: AiSuggestionStatus;
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true }) reviewedBy: string | null;
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true }) reviewedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

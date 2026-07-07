import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Subject } from '../subjects/subject.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ length: 150 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'total_lessons' }) totalLessons: number;
  @Column({ type: 'numeric', precision: 10, scale: 2 }) price: number;
  @Column({ name: 'subject_id', type: 'uuid', nullable: true }) subjectId: string | null;
  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'subject_id' }) subject: Subject | null;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

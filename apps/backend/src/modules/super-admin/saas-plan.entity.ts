import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type SaasPlanType = 'free' | 'pro' | 'enterprise';

@Entity('saas_plans')
export class SaasPlan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 100 }) name: string;
  @Column({ default: 'free' }) type: SaasPlanType;
  @Column({ name: 'price_monthly', type: 'numeric', precision: 10, scale: 2, default: 0 }) priceMonthly: number;
  @Column({ name: 'max_students', default: 50 }) maxStudents: number;
  @Column({ name: 'max_teachers', default: 5 }) maxTeachers: number;
  @Column({ type: 'text', array: true, default: [] }) features: string[];
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  slug: string;

  @Column()
  name: string;

  @Column({ default: 'active' })
  status: 'active' | 'suspended' | 'deleted';

  @Column({ name: 'saas_plan_id', type: 'uuid', nullable: true })
  saasPlanId: string | null;

  @Column({ name: 'saas_status', default: 'active' })
  saasStatus: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export type UserRole = 'tenant_admin' | 'teacher' | 'student' | 'guardian';

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar' })
  role: UserRole;

  @Column({ nullable: true, type: 'varchar' })
  avatarUrl: string | null;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true, type: 'varchar' })
  pushToken: string | null;

  @Column({ name: 'birth_date', nullable: true, type: 'date' })
  birthDate: string | null;

  @Column({ nullable: true, type: 'text' })
  address: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ name: 'payment_day', nullable: true, type: 'smallint' })
  paymentDay: number | null;

  @Column({ name: 'deleted_at', nullable: true, type: 'timestamptz' })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

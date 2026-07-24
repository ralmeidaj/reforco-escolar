import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('invites')
@Index(['tenantId', 'token'], { unique: true })
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column()
  email: string;

  @Column()
  role: string;

  @Column()
  token: string;

  @Column({ name: 'invited_by_id', nullable: true })
  invitedById: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

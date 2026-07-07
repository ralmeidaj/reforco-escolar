import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'tenant_id' }) tenant: Tenant;
  @Column({ name: 'created_by_id' }) createdById: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'created_by_id' }) createdBy: User;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text' }) content: string;
  @Column({ name: 'target_roles', type: 'text', array: true, default: [] }) targetRoles: string[];
  @CreateDateColumn() createdAt: Date;
}

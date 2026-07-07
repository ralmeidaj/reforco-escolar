import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true }) tenantId: string | null;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId: string | null;
  @Column({ name: 'user_role', type: 'varchar', nullable: true }) userRole: string | null;
  @Column({ length: 200 }) action: string;
  @Column({ type: 'varchar', nullable: true }) entity: string | null;
  @Column({ name: 'entity_id', type: 'varchar', nullable: true }) entityId: string | null;
  @Column({ type: 'jsonb', nullable: true }) payload: Record<string, unknown> | null;
  @Column({ type: 'varchar', nullable: true }) ip: string | null;
  @CreateDateColumn() createdAt: Date;
}

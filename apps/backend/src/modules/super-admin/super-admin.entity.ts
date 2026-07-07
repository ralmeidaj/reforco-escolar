import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('super_admins')
export class SuperAdmin {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() password: string;
  @Column({ length: 150 }) name: string;
  @Column({ name: 'totp_secret', type: 'varchar', nullable: true }) totpSecret: string | null;
  @Column({ name: 'totp_enabled', default: false }) totpEnabled: boolean;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

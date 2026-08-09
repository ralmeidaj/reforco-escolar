import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantOpenaiKey1715900000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS openai_api_key_encrypted TEXT
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS openai_api_key_encrypted`);
  }
}

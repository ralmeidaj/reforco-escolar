import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserSoftDelete1716100000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS deleted_at
    `);
  }
}

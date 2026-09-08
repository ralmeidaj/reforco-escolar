import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfileFields1716000000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS birth_date DATE,
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS payment_day SMALLINT
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS birth_date,
        DROP COLUMN IF EXISTS address,
        DROP COLUMN IF EXISTS notes,
        DROP COLUMN IF EXISTS payment_day
    `);
  }
}

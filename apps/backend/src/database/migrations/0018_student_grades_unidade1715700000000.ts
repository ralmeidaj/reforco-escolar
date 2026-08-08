import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentGradesUnidade1715700000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE student_grades ADD COLUMN IF NOT EXISTS unidade VARCHAR NOT NULL DEFAULT ''
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE student_grades DROP COLUMN IF EXISTS unidade`);
  }
}

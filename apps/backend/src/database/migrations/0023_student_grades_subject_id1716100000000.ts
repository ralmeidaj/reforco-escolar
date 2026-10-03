import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentGradesSubjectId1716100000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE student_grades
        ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE student_grades DROP COLUMN IF EXISTS subject_id`);
  }
}

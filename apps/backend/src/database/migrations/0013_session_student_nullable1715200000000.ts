import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionStudentNullable1715200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE sessions ALTER COLUMN student_id DROP NOT NULL`);
    await runner.query(`
      ALTER TABLE sessions
        DROP CONSTRAINT IF EXISTS "FK_sessions_student_id",
        DROP CONSTRAINT IF EXISTS "sessions_student_id_fkey"
    `);
    await runner.query(`
      ALTER TABLE sessions
        ADD CONSTRAINT "sessions_student_id_fkey"
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`UPDATE sessions SET student_id = teacher_id WHERE student_id IS NULL`);
    await runner.query(`ALTER TABLE sessions ALTER COLUMN student_id SET NOT NULL`);
  }
}

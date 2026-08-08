import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentGrades1715600000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE student_grades (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recorded_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject      VARCHAR NOT NULL,
        value        NUMERIC(4,2) NOT NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await qr.query(`
      CREATE INDEX "IDX_student_grades_tenant_student" ON student_grades (tenant_id, student_id)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS student_grades`);
  }
}

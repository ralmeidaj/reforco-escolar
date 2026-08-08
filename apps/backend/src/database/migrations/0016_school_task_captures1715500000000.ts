import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchoolTaskCaptures1715500000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE activity_submissions
        ADD COLUMN IF NOT EXISTS file_type VARCHAR,
        ADD COLUMN IF NOT EXISTS comment TEXT
    `);

    await qr.query(`
      CREATE TABLE school_task_captures (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        student_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url        VARCHAR NOT NULL,
        subject          VARCHAR,
        title            VARCHAR NOT NULL,
        description      TEXT,
        due_date         DATE,
        ai_raw_response  JSONB,
        created_at       TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await qr.query(`
      CREATE INDEX "IDX_school_task_captures_tenant_student"
        ON school_task_captures (tenant_id, student_id)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS school_task_captures`);
    await qr.query(`
      ALTER TABLE activity_submissions
        DROP COLUMN IF EXISTS file_type,
        DROP COLUMN IF EXISTS comment
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivityCorrections1715800000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE activity_corrections (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_by        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject           VARCHAR NOT NULL,
        grade_level       VARCHAR,
        image_url         VARCHAR NOT NULL,
        score             VARCHAR,
        questions         JSONB,
        summary           TEXT,
        voice_orientation TEXT,
        created_at        TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await qr.query(`
      CREATE INDEX "IDX_activity_corrections_tenant_student" ON activity_corrections (tenant_id, student_id)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS activity_corrections`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiPedagogica1714980000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE ai_student_panoramas (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        student_id      UUID NOT NULL,
        subject_id      UUID,
        strengths       TEXT[] NOT NULL DEFAULT '{}',
        needs_review    TEXT[] NOT NULL DEFAULT '{}',
        never_studied   TEXT[] NOT NULL DEFAULT '{}',
        level           VARCHAR(30),
        summary         TEXT,
        generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, student_id, subject_id)
      );
      CREATE INDEX idx_panoramas_tenant_student ON ai_student_panoramas(tenant_id, student_id);
    `);

    await runner.query(`
      CREATE TYPE ai_suggestion_type   AS ENUM ('quiz', 'exercicio', 'desafio');
      CREATE TYPE ai_suggestion_status AS ENUM ('pending_review', 'approved', 'rejected');

      CREATE TABLE ai_activity_suggestions (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        student_id    UUID NOT NULL,
        subject_id    UUID NOT NULL,
        title         VARCHAR(200) NOT NULL,
        content       TEXT NOT NULL,
        type          ai_suggestion_type   NOT NULL DEFAULT 'exercicio',
        status        ai_suggestion_status NOT NULL DEFAULT 'pending_review',
        reviewed_by   UUID,
        reviewed_at   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_suggestions_tenant ON ai_activity_suggestions(tenant_id, status);
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS ai_activity_suggestions`);
    await runner.query(`DROP TYPE IF EXISTS ai_suggestion_status`);
    await runner.query(`DROP TYPE IF EXISTS ai_suggestion_type`);
    await runner.query(`DROP TABLE IF EXISTS ai_student_panoramas`);
  }
}

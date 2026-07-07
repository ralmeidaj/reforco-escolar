import { MigrationInterface, QueryRunner } from 'typeorm';

export class Finance1714950000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE plans (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name         VARCHAR(150) NOT NULL,
        description  TEXT,
        total_lessons INT NOT NULL,
        price        NUMERIC(10,2) NOT NULL,
        subject_id   UUID REFERENCES subjects(id) ON DELETE SET NULL,
        active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_plans_tenant ON plans(tenant_id);
    `);

    await runner.query(`
      CREATE TABLE student_plans (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id         UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        lessons_total   INT NOT NULL,
        lessons_used    INT NOT NULL DEFAULT 0,
        enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at      TIMESTAMPTZ,
        active          BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_student_plans_student ON student_plans(tenant_id, student_id, active);
    `);

    await runner.query(`
      CREATE TYPE payment_status AS ENUM ('pendente', 'pago', 'cancelado');

      CREATE TABLE payments (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_plan_id UUID REFERENCES student_plans(id) ON DELETE SET NULL,
        amount          NUMERIC(10,2) NOT NULL,
        status          payment_status NOT NULL DEFAULT 'pendente',
        method          VARCHAR(50),
        external_ref    VARCHAR(200),
        paid_at         TIMESTAMPTZ,
        due_date        DATE,
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_payments_student ON payments(tenant_id, student_id);
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS payments`);
    await runner.query(`DROP TYPE IF EXISTS payment_status`);
    await runner.query(`DROP TABLE IF EXISTS student_plans`);
    await runner.query(`DROP TABLE IF EXISTS plans`);
  }
}

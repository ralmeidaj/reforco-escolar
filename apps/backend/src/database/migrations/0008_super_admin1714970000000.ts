import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuperAdmin1714970000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE super_admins (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email        VARCHAR(255) NOT NULL UNIQUE,
        password     VARCHAR(255) NOT NULL,
        name         VARCHAR(150) NOT NULL,
        totp_secret  VARCHAR(255),
        totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await runner.query(`
      CREATE TYPE saas_plan_type AS ENUM ('free', 'pro', 'enterprise');

      CREATE TABLE saas_plans (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(100) NOT NULL,
        type          saas_plan_type NOT NULL DEFAULT 'free',
        price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
        max_students  INT NOT NULL DEFAULT 50,
        max_teachers  INT NOT NULL DEFAULT 5,
        features      TEXT[] NOT NULL DEFAULT '{}',
        active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await runner.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS saas_plan_id UUID REFERENCES saas_plans(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS saas_status VARCHAR(20) NOT NULL DEFAULT 'active';
    `);

    await runner.query(`
      CREATE TABLE audit_logs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
        user_id     UUID,
        user_role   VARCHAR(50),
        action      VARCHAR(200) NOT NULL,
        entity      VARCHAR(100),
        entity_id   VARCHAR(200),
        payload     JSONB,
        ip          VARCHAR(50),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
      CREATE INDEX idx_audit_logs_user   ON audit_logs(user_id, created_at DESC);
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS audit_logs`);
    await runner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS saas_plan_id, DROP COLUMN IF EXISTS saas_status`);
    await runner.query(`DROP TABLE IF EXISTS saas_plans`);
    await runner.query(`DROP TYPE IF EXISTS saas_plan_type`);
    await runner.query(`DROP TABLE IF EXISTS super_admins`);
  }
}

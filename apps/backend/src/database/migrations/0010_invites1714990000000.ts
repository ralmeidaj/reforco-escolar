import { MigrationInterface, QueryRunner } from 'typeorm';

export class Invites1714990000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR NOT NULL,
        role VARCHAR NOT NULL,
        token VARCHAR NOT NULL,
        invited_by_id UUID,
        expires_at TIMESTAMPTZ NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, token)
      )
    `);
    await runner.query(`CREATE INDEX idx_invites_tenant ON invites(tenant_id)`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS invites`);
  }
}

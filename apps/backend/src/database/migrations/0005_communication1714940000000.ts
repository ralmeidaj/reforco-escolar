import { MigrationInterface, QueryRunner } from 'typeorm';

export class Communication1714940000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
    `);

    await runner.query(`
      CREATE TABLE messages (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        from_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content     TEXT NOT NULL,
        read_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_messages_tenant ON messages(tenant_id);
      CREATE INDEX idx_messages_conversation ON messages(tenant_id, from_id, to_id);
    `);

    await runner.query(`
      CREATE TABLE notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       VARCHAR(200) NOT NULL,
        body        TEXT NOT NULL,
        type        VARCHAR(50) NOT NULL DEFAULT 'info',
        read        BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_notifications_user ON notifications(tenant_id, user_id, read);
    `);

    await runner.query(`
      CREATE TABLE announcements (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title         VARCHAR(200) NOT NULL,
        content       TEXT NOT NULL,
        target_roles  TEXT[] NOT NULL DEFAULT '{}',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_announcements_tenant ON announcements(tenant_id);
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS announcements`);
    await runner.query(`DROP TABLE IF EXISTS notifications`);
    await runner.query(`DROP TABLE IF EXISTS messages`);
    await runner.query(`ALTER TABLE users DROP COLUMN IF EXISTS push_token`);
  }
}

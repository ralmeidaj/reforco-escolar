import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoomCheckins1715000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE room_checkins (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID        NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
        room_id     UUID        NOT NULL REFERENCES rooms(id)    ON DELETE CASCADE,
        student_id  UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
        checkin_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checkout_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_room_checkins_tenant_room
        ON room_checkins(tenant_id, room_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_room_checkins_student
        ON room_checkins(student_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS room_checkins`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoomSchedules1715400000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE room_schedules (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        room_id      UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        shift        VARCHAR(10) NOT NULL CHECK (shift IN ('manhã','tarde','noite')),
        subject_id   UUID REFERENCES subjects(id) ON DELETE SET NULL,
        UNIQUE (tenant_id, room_id, day_of_week, shift)
      )
    `);

    await qr.query(`
      CREATE TABLE room_schedule_teachers (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id UUID NOT NULL REFERENCES room_schedules(id) ON DELETE CASCADE,
        teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (schedule_id, teacher_id)
      )
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS room_schedule_teachers`);
    await qr.query(`DROP TABLE IF EXISTS room_schedules`);
  }
}

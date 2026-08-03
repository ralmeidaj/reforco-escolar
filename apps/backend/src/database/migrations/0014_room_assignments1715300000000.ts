import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoomAssignments1715300000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE room_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL
      )
    `);

    // migra dados existentes
    await runner.query(`
      INSERT INTO room_assignments (tenant_id, room_id, teacher_id, subject_id)
      SELECT tenant_id, id, teacher_id, subject_id
      FROM rooms
      WHERE teacher_id IS NOT NULL
    `);

    await runner.query(`ALTER TABLE rooms DROP COLUMN IF EXISTS teacher_id`);
    await runner.query(`ALTER TABLE rooms DROP COLUMN IF EXISTS subject_id`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE rooms ADD COLUMN teacher_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await runner.query(`ALTER TABLE rooms ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL`);
    await runner.query(`DROP TABLE room_assignments`);
  }
}

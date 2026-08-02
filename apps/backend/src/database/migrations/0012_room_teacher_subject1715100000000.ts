import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoomTeacherSubject1715100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rooms
        ADD COLUMN teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rooms
        DROP COLUMN IF EXISTS teacher_id,
        DROP COLUMN IF EXISTS subject_id
    `);
  }
}

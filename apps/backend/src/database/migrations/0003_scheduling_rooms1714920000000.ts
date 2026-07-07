import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchedulingRooms1714920000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"       uuid NOT NULL,
        "name"            character varying NOT NULL,
        "capacity"        integer NOT NULL DEFAULT 10,
        "fixed_group_id"  uuid,
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rooms" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rooms_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rooms_group" FOREIGN KEY ("fixed_group_id")
          REFERENCES "groups"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_rooms_tenant" ON "rooms" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "availability_slots" (
        "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"     uuid NOT NULL,
        "teacher_id"    uuid NOT NULL,
        "day_of_week"   smallint,
        "start_time"    time NOT NULL,
        "end_time"      time NOT NULL,
        "is_recurring"  boolean NOT NULL DEFAULT true,
        "specific_date" date,
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_availability_slots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_availability_slots_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_availability_slots_teacher" FOREIGN KEY ("teacher_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_availability_slots_tenant_teacher" ON "availability_slots" ("tenant_id", "teacher_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"        uuid NOT NULL,
        "teacher_id"       uuid NOT NULL,
        "student_id"       uuid NOT NULL,
        "subject_id"       uuid NOT NULL,
        "room_id"          uuid,
        "slot_id"          uuid,
        "scheduled_at"     TIMESTAMP NOT NULL,
        "duration_minutes" integer NOT NULL DEFAULT 60,
        "status"           character varying NOT NULL DEFAULT 'agendada',
        "channel"          character varying NOT NULL DEFAULT 'presencial',
        "meet_link"        character varying,
        "cancel_reason"    character varying,
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sessions_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sessions_teacher" FOREIGN KEY ("teacher_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sessions_student" FOREIGN KEY ("student_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sessions_subject" FOREIGN KEY ("subject_id")
          REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sessions_room" FOREIGN KEY ("room_id")
          REFERENCES "rooms"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_sessions_slot" FOREIGN KEY ("slot_id")
          REFERENCES "availability_slots"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_tenant_scheduled" ON "sessions" ("tenant_id", "scheduled_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_tenant_teacher" ON "sessions" ("tenant_id", "teacher_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_tenant_student" ON "sessions" ("tenant_id", "student_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "availability_slots"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
  }
}

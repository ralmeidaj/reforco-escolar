import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceProgress1714930000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "attendances" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"  uuid NOT NULL,
        "session_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "status"     character varying NOT NULL DEFAULT 'presente',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendances" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attendance_session_student" UNIQUE ("tenant_id", "session_id", "student_id"),
        CONSTRAINT "FK_attendances_tenant"  FOREIGN KEY ("tenant_id")  REFERENCES "tenants"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_attendances_session" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_attendances_student" FOREIGN KEY ("student_id") REFERENCES "users"("id")    ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_attendances_tenant_session" ON "attendances" ("tenant_id","session_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_attendances_tenant_student" ON "attendances" ("tenant_id","student_id")`);

    await queryRunner.query(`
      CREATE TABLE "session_notes" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"  uuid NOT NULL,
        "session_id" uuid NOT NULL,
        "teacher_id" uuid NOT NULL,
        "content"    text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_session_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_session_notes_tenant"  FOREIGN KEY ("tenant_id")  REFERENCES "tenants"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_session_notes_session" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_session_notes_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id")    ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "student_progress" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"  uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "subject_id" uuid NOT NULL,
        "level"      character varying NOT NULL DEFAULT 'iniciante',
        "notes"      text,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_progress" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_progress_student_subject" UNIQUE ("tenant_id","student_id","subject_id"),
        CONSTRAINT "FK_student_progress_tenant"  FOREIGN KEY ("tenant_id")  REFERENCES "tenants"("id")   ON DELETE CASCADE,
        CONSTRAINT "FK_student_progress_student" FOREIGN KEY ("student_id") REFERENCES "users"("id")     ON DELETE CASCADE,
        CONSTRAINT "FK_student_progress_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")  ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"   uuid NOT NULL,
        "teacher_id"  uuid NOT NULL,
        "student_id"  uuid NOT NULL,
        "subject_id"  uuid NOT NULL,
        "title"       character varying NOT NULL,
        "description" text,
        "type"        character varying NOT NULL DEFAULT 'padrao',
        "due_date"    date,
        "done"        boolean NOT NULL DEFAULT false,
        "done_at"     TIMESTAMP,
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tasks_tenant"  FOREIGN KEY ("tenant_id")  REFERENCES "tenants"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_tasks_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id")    ON DELETE CASCADE,
        CONSTRAINT "FK_tasks_student" FOREIGN KEY ("student_id") REFERENCES "users"("id")    ON DELETE CASCADE,
        CONSTRAINT "FK_tasks_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_tasks_tenant_student" ON "tasks" ("tenant_id","student_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_tasks_due_date" ON "tasks" ("tenant_id","due_date") WHERE "done" = false`);

    await queryRunner.query(`
      CREATE TABLE "study_logs" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"   uuid NOT NULL,
        "student_id"  uuid NOT NULL,
        "session_id"  uuid,
        "subject_id"  uuid NOT NULL,
        "topic"       character varying NOT NULL,
        "pages_read"  integer NOT NULL DEFAULT 0,
        "studied_at"  date NOT NULL DEFAULT CURRENT_DATE,
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_study_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_study_logs_tenant"  FOREIGN KEY ("tenant_id")  REFERENCES "tenants"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_study_logs_student" FOREIGN KEY ("student_id") REFERENCES "users"("id")    ON DELETE CASCADE,
        CONSTRAINT "FK_study_logs_session" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_study_logs_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "activity_submissions" (
        "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"    uuid NOT NULL,
        "student_id"   uuid NOT NULL,
        "task_id"      uuid,
        "file_url"     character varying NOT NULL,
        "notes"        text,
        "submitted_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_submissions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_activity_submissions_tenant"  FOREIGN KEY ("tenant_id")  REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_activity_submissions_student" FOREIGN KEY ("student_id") REFERENCES "users"("id")   ON DELETE CASCADE,
        CONSTRAINT "FK_activity_submissions_task"    FOREIGN KEY ("task_id")    REFERENCES "tasks"("id")   ON DELETE SET NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "activity_submissions"`);
    await queryRunner.query(`DROP TABLE "study_logs"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "student_progress"`);
    await queryRunner.query(`DROP TABLE "session_notes"`);
    await queryRunner.query(`DROP TABLE "attendances"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubjectsGroups1714910000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subjects" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"  uuid NOT NULL,
        "name"       character varying NOT NULL,
        "color"      character varying NOT NULL DEFAULT '#3B82F6',
        "icon"       character varying NOT NULL DEFAULT 'book',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subjects" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subjects_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subjects_tenant" ON "subjects" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"  uuid NOT NULL,
        "name"       character varying NOT NULL,
        "level"      character varying NOT NULL DEFAULT 'fundamental',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_groups_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_groups_tenant" ON "groups" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "teacher_subjects" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"  uuid NOT NULL,
        "teacher_id" uuid NOT NULL,
        "subject_id" uuid NOT NULL,
        CONSTRAINT "PK_teacher_subjects" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teacher_subjects" UNIQUE ("tenant_id", "teacher_id", "subject_id"),
        CONSTRAINT "FK_teacher_subjects_tenant"  FOREIGN KEY ("tenant_id")  REFERENCES "tenants"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_teacher_subjects_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id")    ON DELETE CASCADE,
        CONSTRAINT "FK_teacher_subjects_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_teacher_subjects_tenant_teacher" ON "teacher_subjects" ("tenant_id", "teacher_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "student_enrollments" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"   uuid NOT NULL,
        "student_id"  uuid NOT NULL,
        "subject_id"  uuid NOT NULL,
        "group_id"    uuid,
        "enrolled_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_enrollments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_student_enrollments" UNIQUE ("tenant_id", "student_id", "subject_id"),
        CONSTRAINT "FK_enrollments_tenant"  FOREIGN KEY ("tenant_id")  REFERENCES "tenants"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_enrollments_student" FOREIGN KEY ("student_id") REFERENCES "users"("id")    ON DELETE CASCADE,
        CONSTRAINT "FK_enrollments_subject" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_enrollments_group"   FOREIGN KEY ("group_id")   REFERENCES "groups"("id")   ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_enrollments_tenant_student" ON "student_enrollments" ("tenant_id", "student_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "guardian_students" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"   uuid NOT NULL,
        "guardian_id" uuid NOT NULL,
        "student_id"  uuid NOT NULL,
        CONSTRAINT "PK_guardian_students" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_guardian_students" UNIQUE ("tenant_id", "guardian_id", "student_id"),
        CONSTRAINT "FK_guardian_students_tenant"   FOREIGN KEY ("tenant_id")   REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_guardian_students_guardian" FOREIGN KEY ("guardian_id") REFERENCES "users"("id")   ON DELETE CASCADE,
        CONSTRAINT "FK_guardian_students_student"  FOREIGN KEY ("student_id")  REFERENCES "users"("id")   ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_guardian_students_tenant_guardian" ON "guardian_students" ("tenant_id", "guardian_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "guardian_students"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_enrollments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teacher_subjects"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subjects"`);
  }
}

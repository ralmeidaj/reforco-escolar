import { MigrationInterface, QueryRunner } from 'typeorm';

export class Reports1714960000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // Materialized view para KPIs do tenant (atualizada por cron)
    await runner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_kpis AS
      SELECT
        t.id                                                      AS tenant_id,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student')   AS active_students,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'teacher')   AS active_teachers,
        COUNT(s.id)                                               AS total_sessions,
        COUNT(s.id) FILTER (WHERE s.status = 'realizada')        AS completed_sessions,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pago'), 0) AS revenue_total,
        COUNT(a.id) FILTER (WHERE a.status = 'ausente')          AS total_absences
      FROM tenants t
      LEFT JOIN users u         ON u.tenant_id = t.id
      LEFT JOIN sessions s      ON s.tenant_id = t.id
      LEFT JOIN payments p      ON p.tenant_id = t.id
      LEFT JOIN attendances a   ON a.tenant_id = t.id
      GROUP BY t.id
      WITH DATA;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_kpis_tenant ON tenant_kpis(tenant_id);
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP MATERIALIZED VIEW IF EXISTS tenant_kpis`);
  }
}

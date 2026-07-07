import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';

export interface AdminKpis {
  activeStudents: number;
  activeTeachers: number;
  totalSessions: number;
  completedSessions: number;
  revenueTotal: number;
  totalAbsences: number;
  attendanceRate: number;
}

export interface TeacherReport {
  totalSessions: number;
  completedSessions: number;
  studentCount: number;
  pendingTasks: number;
}

export interface StudentReport {
  attendanceRate: number;
  totalSessions: number;
  presentCount: number;
  pendingTasks: number;
  doneTasks: number;
  studyLogCount: number;
  progressBySubject: { subjectName: string; level: string }[];
}

export interface GuardianReport {
  student: { id: string; name: string };
  attendanceRate: number;
  totalSessions: number;
  presentCount: number;
  pendingTasks: number;
  lessonsRemaining: number;
  progressBySubject: { subjectName: string; level: string }[];
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async getAdminKpis(tenantId: string): Promise<AdminKpis> {
    const rows = await this.ds.query(
      `SELECT * FROM tenant_kpis WHERE tenant_id = $1`,
      [tenantId],
    );
    if (!rows.length) return { activeStudents: 0, activeTeachers: 0, totalSessions: 0, completedSessions: 0, revenueTotal: 0, totalAbsences: 0, attendanceRate: 100 };
    const r = rows[0];
    const attendanceRate = r.total_sessions > 0
      ? Math.round(((r.total_sessions - r.total_absences) / r.total_sessions) * 100)
      : 100;
    return {
      activeStudents: Number(r.active_students),
      activeTeachers: Number(r.active_teachers),
      totalSessions: Number(r.total_sessions),
      completedSessions: Number(r.completed_sessions),
      revenueTotal: Number(r.revenue_total),
      totalAbsences: Number(r.total_absences),
      attendanceRate,
    };
  }

  async getTeacherReport(tenantId: string, teacherId: string): Promise<TeacherReport> {
    const [sessions, students, tasks] = await Promise.all([
      this.ds.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'realizada') AS completed
         FROM sessions WHERE tenant_id = $1 AND teacher_id = $2`,
        [tenantId, teacherId],
      ),
      this.ds.query(
        `SELECT COUNT(DISTINCT student_id) AS cnt FROM sessions WHERE tenant_id = $1 AND teacher_id = $2`,
        [tenantId, teacherId],
      ),
      this.ds.query(
        `SELECT COUNT(*) AS pending FROM tasks WHERE tenant_id = $1 AND teacher_id = $2 AND done = false`,
        [tenantId, teacherId],
      ),
    ]);
    return {
      totalSessions: Number(sessions[0].total),
      completedSessions: Number(sessions[0].completed),
      studentCount: Number(students[0].cnt),
      pendingTasks: Number(tasks[0].pending),
    };
  }

  async getStudentReport(tenantId: string, studentId: string): Promise<StudentReport> {
    const [attendance, tasks, studyLogs, progress] = await Promise.all([
      this.ds.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'presente') AS present
         FROM attendances WHERE tenant_id = $1 AND student_id = $2`,
        [tenantId, studentId],
      ),
      this.ds.query(
        `SELECT COUNT(*) FILTER (WHERE done = false) AS pending,
                COUNT(*) FILTER (WHERE done = true) AS done
         FROM tasks WHERE tenant_id = $1 AND student_id = $2`,
        [tenantId, studentId],
      ),
      this.ds.query(
        `SELECT COUNT(*) AS cnt FROM study_logs WHERE tenant_id = $1 AND student_id = $2`,
        [tenantId, studentId],
      ),
      this.ds.query(
        `SELECT s.name AS subject_name, sp.level
         FROM student_progress sp
         JOIN subjects s ON s.id = sp.subject_id
         WHERE sp.tenant_id = $1 AND sp.student_id = $2`,
        [tenantId, studentId],
      ),
    ]);
    const total = Number(attendance[0].total);
    const present = Number(attendance[0].present);
    return {
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 100,
      totalSessions: total,
      presentCount: present,
      pendingTasks: Number(tasks[0].pending),
      doneTasks: Number(tasks[0].done),
      studyLogCount: Number(studyLogs[0].cnt),
      progressBySubject: progress.map((r: any) => ({ subjectName: r.subject_name, level: r.level })),
    };
  }

  async getGuardianReport(tenantId: string, studentId: string): Promise<GuardianReport> {
    const [studentRow, report, balance, progress] = await Promise.all([
      this.ds.query(`SELECT id, name FROM users WHERE tenant_id = $1 AND id = $2`, [tenantId, studentId]),
      this.getStudentReport(tenantId, studentId),
      this.ds.query(
        `SELECT COALESCE(SUM(lessons_total - lessons_used), 0) AS remaining
         FROM student_plans WHERE tenant_id = $1 AND student_id = $2 AND active = true`,
        [tenantId, studentId],
      ),
      this.ds.query(
        `SELECT s.name AS subject_name, sp.level
         FROM student_progress sp
         JOIN subjects s ON s.id = sp.subject_id
         WHERE sp.tenant_id = $1 AND sp.student_id = $2`,
        [tenantId, studentId],
      ),
    ]);
    return {
      student: studentRow[0] ?? { id: studentId, name: 'Aluno' },
      attendanceRate: report.attendanceRate,
      totalSessions: report.totalSessions,
      presentCount: report.presentCount,
      pendingTasks: report.pendingTasks,
      lessonsRemaining: Number(balance[0].remaining),
      progressBySubject: progress.map((r: any) => ({ subjectName: r.subject_name, level: r.level })),
    };
  }

  // Refresh da materialized view a cada hora
  @Cron('0 * * * *')
  async refreshKpis(): Promise<void> {
    try {
      await this.ds.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_kpis`);
      this.logger.log('tenant_kpis refreshed');
    } catch (err) {
      this.logger.warn(`Falha ao atualizar tenant_kpis: ${err}`);
    }
  }
}

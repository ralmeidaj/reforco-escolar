import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Task } from '../tasks/task.entity';
import { Attendance } from '../attendance/attendance.entity';
import { User } from '../auth/user.entity';

@Injectable()
export class CommunicationCronService {
  private readonly logger = new Logger(CommunicationCronService.name);

  constructor(
    private readonly notifications: NotificationsService,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // Lembretes de prazo: D-2 e D-1 às 08h
  @Cron('0 8 * * *')
  async remindUpcomingTasks(): Promise<void> {
    const today = new Date();
    const d1 = new Date(today); d1.setDate(today.getDate() + 1);
    const d2 = new Date(today); d2.setDate(today.getDate() + 2);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const tasks = await this.taskRepo
      .createQueryBuilder('t')
      .where('t.done = false AND t.due_date IN (:d1, :d2)', { d1: fmt(d1), d2: fmt(d2) })
      .getMany();

    for (const task of tasks) {
      const daysLeft = task.dueDate === fmt(d1) ? 1 : 2;
      const label = daysLeft === 1 ? 'amanhã' : 'em 2 dias';

      await this.notifications.send({
        tenantId: task.tenantId,
        userId: task.studentId,
        title: 'Tarefa próxima do prazo',
        body: `"${task.title}" vence ${label}.`,
        type: 'task',
      });

      await this.notifications.send({
        tenantId: task.tenantId,
        userId: task.teacherId,
        title: 'Tarefa próxima do prazo',
        body: `A tarefa "${task.title}" do aluno vence ${label}.`,
        type: 'task',
      });

      await this.notifications.sendPush(task.studentId, 'Tarefa próxima do prazo', `"${task.title}" vence ${label}.`);
    }

    this.logger.log(`Lembretes de prazo enviados: ${tasks.length} tarefas`);
  }

  // Relatório de faltas do dia às 18h
  @Cron('0 18 * * *')
  async dailyAbsenceAlert(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    const absences: { tenant_id: string; student_id: string }[] = await this.attendanceRepo.query(
      `SELECT DISTINCT a.tenant_id, a.student_id
       FROM attendances a
       JOIN sessions s ON s.id = a.session_id
       WHERE a.status = 'ausente' AND DATE(s.scheduled_at) = $1`,
      [today],
    );

    if (absences.length === 0) return;

    const grouped: Record<string, string[]> = {};
    for (const r of absences) {
      grouped[r.tenant_id] = grouped[r.tenant_id] ?? [];
      grouped[r.tenant_id].push(r.student_id);
    }

    for (const [tenantId, studentIds] of Object.entries(grouped)) {
      const admins = await this.userRepo.find({ where: { tenantId, role: 'tenant_admin' as any } });

      for (const admin of admins) {
        await this.notifications.send({
          tenantId,
          userId: admin.id,
          title: 'Relatório de faltas do dia',
          body: `${studentIds.length} aluno(s) faltaram hoje. Verifique e entre em contato com os responsáveis.`,
          type: 'attendance',
        });
      }
    }

    this.logger.log(`Alertas de falta enviados: ${absences.length} ausências em ${Object.keys(grouped).length} tenant(s)`);
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, IsNull, Repository } from 'typeorm';
import { Room } from './room.entity';
import { RoomAssignment } from './room-assignment.entity';
import { RoomCheckin } from './room-checkin.entity';
import { RoomSchedule } from './room-schedule.entity';
import { RoomScheduleTeacher } from './room-schedule-teacher.entity';
import { User } from '../auth/user.entity';
import { Session } from '../scheduling/session.entity';
import { Attendance } from '../attendance/attendance.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CreateRoomAssignmentDto } from './dto/create-room-assignment.dto';
import { UpsertRoomScheduleDto } from './dto/upsert-room-schedule.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepo: Repository<Room>,
    @InjectRepository(RoomAssignment)
    private assignmentsRepo: Repository<RoomAssignment>,
    @InjectRepository(RoomCheckin)
    private checkinsRepo: Repository<RoomCheckin>,
    @InjectRepository(RoomSchedule)
    private schedulesRepo: Repository<RoomSchedule>,
    @InjectRepository(RoomScheduleTeacher)
    private scheduleTeachersRepo: Repository<RoomScheduleTeacher>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Session)
    private sessionsRepo: Repository<Session>,
    @InjectRepository(Attendance)
    private attendancesRepo: Repository<Attendance>,
  ) {}

  findAll(tenantId: string) {
    return this.roomsRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
      relations: { fixedGroup: true, assignments: { teacher: true, subject: true } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const room = await this.roomsRepo.findOne({
      where: { tenantId, id },
      relations: { fixedGroup: true, assignments: { teacher: true, subject: true } },
    });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return room;
  }

  async create(tenantId: string, dto: CreateRoomDto) {
    const room = this.roomsRepo.create({ name: dto.name, capacity: dto.capacity, tenantId });
    return this.roomsRepo.save(room);
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto) {
    const room = await this.findOne(tenantId, id);
    if (dto.name !== undefined) room.name = dto.name;
    if (dto.capacity !== undefined) room.capacity = dto.capacity;
    return this.roomsRepo.save(room);
  }

  async remove(tenantId: string, id: string) {
    const room = await this.findOne(tenantId, id);
    await this.roomsRepo.remove(room);
  }

  // ── Assignments (professor por sala) ──────────────────────────────────────────

  async addAssignment(tenantId: string, roomId: string, dto: CreateRoomAssignmentDto) {
    await this.findOne(tenantId, roomId);
    const assignment = this.assignmentsRepo.create({
      tenantId,
      roomId,
      teacherId: dto.teacherId,
      subjectId: dto.subjectId ?? null,
    });
    const saved = await this.assignmentsRepo.save(assignment);
    return this.assignmentsRepo.findOne({
      where: { id: saved.id },
      relations: { teacher: true, subject: true },
    });
  }

  async removeAssignment(tenantId: string, roomId: string, assignmentId: string) {
    const a = await this.assignmentsRepo.findOne({
      where: { id: assignmentId, roomId, tenantId },
    });
    if (!a) throw new NotFoundException('Alocação não encontrada');
    await this.assignmentsRepo.remove(a);
  }

  // ── Ocupação ──────────────────────────────────────────────────────────────────

  async getOccupancy(tenantId: string) {
    const rooms = await this.roomsRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
      relations: { assignments: { teacher: true, subject: true } },
    });

    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);

    const occupancyRows: Array<{ roomId: string; count: string }> = await this.roomsRepo
      .createQueryBuilder('r')
      .select('r.id', 'roomId')
      .addSelect('COUNT(s.id)', 'count')
      .leftJoin(
        'sessions',
        's',
        's.room_id = r.id AND s.tenant_id = r.tenant_id AND s.status IN (:...active) AND s.scheduled_at BETWEEN :start AND :end',
        { active: ['agendada', 'confirmada', 'realizada'], start: windowStart, end: windowEnd },
      )
      .where('r.tenant_id = :tenantId', { tenantId })
      .groupBy('r.id')
      .getRawMany();

    const countByRoom = Object.fromEntries(occupancyRows.map((r) => [r.roomId, Number(r.count)]));

    return rooms.map((room) => ({
      ...room,
      currentOccupancy: countByRoom[room.id] ?? 0,
    }));
  }

  // ── Check-in de aluno ─────────────────────────────────────────────────────────

  async getAvailableRooms(tenantId: string) {
    const rooms = await this.roomsRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
      relations: { assignments: { teacher: true, subject: true } },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows: Array<{ roomId: string; count: string }> = await this.checkinsRepo
      .createQueryBuilder('c')
      .select('c.room_id', 'roomId')
      .addSelect('COUNT(c.id)', 'count')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.checkout_at IS NULL')
      .andWhere('c.checkin_at >= :today', { today })
      .groupBy('c.room_id')
      .getRawMany();

    const occupancy = Object.fromEntries(rows.map((r) => [r.roomId, Number(r.count)]));

    // Determina turno atual e dia da semana pelo horário do servidor
    const now = new Date();
    const h = now.getHours();
    const currentShift = h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite';
    const dayOfWeek = now.getDay(); // 0=Dom … 6=Sáb

    // Salas com horário cadastrado para hoje + turno atual
    const scheduledRooms = await this.schedulesRepo.find({
      where: { tenantId, dayOfWeek, shift: currentShift as any },
      select: { roomId: true },
    });
    const scheduleRoomIds = new Set(scheduledRooms.map((s) => s.roomId));

    // Exibe apenas salas com horário cadastrado para o turno atual
    const visibleRooms = rooms.filter((r) => scheduleRoomIds.has(r.id));

    return visibleRooms.map((room) => {
      const current = occupancy[room.id] ?? 0;
      return {
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        currentOccupancy: current,
        available: room.capacity - current,
        isFull: current >= room.capacity,
        assignments: room.assignments.map((a) => ({
          id: a.id,
          teacher: { id: a.teacher.id, name: a.teacher.name },
          subject: a.subject ? { id: a.subject.id, name: a.subject.name } : null,
        })),
      };
    });
  }

  async checkin(tenantId: string, studentId: string, roomId: string) {
    const room = await this.findOne(tenantId, roomId);

    // auto-checkout de sala anterior
    await this.checkinsRepo.update(
      { tenantId, studentId, checkoutAt: IsNull() },
      { checkoutAt: new Date() },
    );

    // verifica capacidade
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await this.checkinsRepo.count({
      where: { tenantId, roomId, checkoutAt: IsNull() },
    });
    if (count >= room.capacity) {
      throw new BadRequestException('Sala sem vagas disponíveis');
    }

    const checkin = this.checkinsRepo.create({ tenantId, roomId, studentId });
    const saved = await this.checkinsRepo.save(checkin);

    // distribui para o professor com menos alunos ativos
    if (room.assignments?.length) {
      this.createWalkInSession(tenantId, studentId, room).catch(() => {});
    }

    return { ...saved, room: { id: room.id, name: room.name, capacity: room.capacity } };
  }

  private async createWalkInSession(tenantId: string, studentId: string, room: Room) {
    const assignments = room.assignments ?? [];
    if (!assignments.length) return;

    // conta check-ins ativos por professor nesta sala
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkinCounts: Array<{ teacher_id: string; cnt: string }> = await this.checkinsRepo
      .createQueryBuilder('c')
      .innerJoin('sessions', 's', 's.student_id = c.student_id AND s.room_id = c.room_id AND s.tenant_id = c.tenant_id AND s.scheduled_at >= :today', { today })
      .select('s.teacher_id', 'teacher_id')
      .addSelect('COUNT(c.id)', 'cnt')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.room_id = :roomId', { roomId: room.id })
      .andWhere('c.checkout_at IS NULL')
      .groupBy('s.teacher_id')
      .getRawMany();

    const countMap = Object.fromEntries(checkinCounts.map((r) => [r.teacher_id, Number(r.cnt)]));

    // escolhe o assignment com menos alunos
    const chosen = [...assignments].sort(
      (a, b) => (countMap[a.teacherId] ?? 0) - (countMap[b.teacherId] ?? 0),
    )[0];

    const now = new Date();
    const windowStart = new Date(now.getTime() - 90 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);

    // procura sessão pré-agendada sem aluno para este professor+disciplina
    const pending = await this.sessionsRepo.findOne({
      where: {
        tenantId,
        teacherId: chosen.teacherId,
        subjectId: chosen.subjectId ?? undefined,
        studentId: IsNull(),
        status: 'agendada' as any,
        scheduledAt: Between(windowStart, windowEnd),
      },
      order: { scheduledAt: 'ASC' },
    });

    let sessionId: string;

    if (pending) {
      pending.studentId = studentId;
      pending.roomId = room.id;
      pending.status = 'confirmada' as any;
      const updated = await this.sessionsRepo.save(pending);
      sessionId = updated.id;
    } else {
      const session = this.sessionsRepo.create({
        tenantId,
        teacherId: chosen.teacherId,
        studentId,
        subjectId: chosen.subjectId ?? undefined,
        roomId: room.id,
        scheduledAt: now,
        status: 'agendada' as any,
        channel: 'presencial',
      });
      const saved = await this.sessionsRepo.save(session);
      sessionId = (saved as any).id;
    }

    const existing = await this.attendancesRepo.findOne({
      where: { tenantId, sessionId, studentId },
    });
    if (!existing) {
      await this.attendancesRepo.save(
        this.attendancesRepo.create({ tenantId, sessionId, studentId, status: 'presente' }),
      );
    }
  }

  async checkout(tenantId: string, studentId: string) {
    await this.checkinsRepo.update(
      { tenantId, studentId, checkoutAt: IsNull() },
      { checkoutAt: new Date() },
    );
  }

  async adminCheckout(tenantId: string, checkinId: string) {
    await this.checkinsRepo.update(
      { tenantId, id: checkinId, checkoutAt: IsNull() },
      { checkoutAt: new Date() },
    );
  }

  async getMyCheckin(tenantId: string, studentId: string) {
    const checkin = await this.checkinsRepo.findOne({
      where: { tenantId, studentId, checkoutAt: IsNull() },
      relations: { room: true },
    });
    return checkin ?? null;
  }

  async getActiveCheckins(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await this.checkinsRepo
      .createQueryBuilder('c')
      .innerJoin('users', 'u', 'u.id = c.student_id AND u.tenant_id = c.tenant_id')
      .innerJoin('rooms', 'r', 'r.id = c.room_id AND r.tenant_id = c.tenant_id')
      .leftJoin(
        'sessions',
        's',
        's.student_id = c.student_id AND s.room_id = c.room_id AND s.tenant_id = c.tenant_id AND s.scheduled_at >= :today',
        { today },
      )
      .leftJoin('users', 't', 't.id = s.teacher_id')
      .select([
        'c.id AS checkin_id',
        'c.checkin_at AS checkin_at',
        'u.id AS student_id',
        'u.name AS student_name',
        'r.id AS room_id',
        'r.name AS room_name',
        's.id AS session_id',
        's.teacher_id AS teacher_id',
        't.name AS teacher_name',
      ])
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.checkout_at IS NULL')
      .orderBy('c.checkin_at', 'ASC')
      .getRawMany();

    return rows.map((row) => ({
      checkinId: row.checkin_id,
      checkinAt: row.checkin_at,
      studentId: row.student_id,
      studentName: row.student_name,
      roomId: row.room_id,
      roomName: row.room_name,
      sessionId: row.session_id ?? null,
      teacherId: row.teacher_id ?? null,
      teacherName: row.teacher_name ?? null,
    }));
  }

  // ── Reassign (admin troca professor do aluno) ──────────────────────────────────

  async reassignStudent(tenantId: string, checkinId: string, assignmentId: string) {
    const checkin = await this.checkinsRepo.findOne({ where: { id: checkinId, tenantId } });
    if (!checkin) throw new NotFoundException('Check-in não encontrado');

    const assignment = await this.assignmentsRepo.findOne({
      where: { id: assignmentId, tenantId },
      relations: { teacher: true, subject: true },
    });
    if (!assignment) throw new NotFoundException('Alocação não encontrada');

    // atualiza sessão ativa do aluno nesta sala hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const session = await this.sessionsRepo.findOne({
      where: {
        tenantId,
        studentId: checkin.studentId,
        roomId: checkin.roomId,
        scheduledAt: Between(today, new Date()),
      },
      order: { scheduledAt: 'DESC' },
    });

    if (session) {
      session.teacherId = assignment.teacherId;
      session.subjectId = assignment.subjectId as string;
      await this.sessionsRepo.save(session);
    }

    return { success: true, teacher: assignment.teacher.name };
  }

  async kioskSearchStudents(tenantId: string, q: string) {
    if (!q || q.length < 2) return [];
    return this.usersRepo.find({
      where: { tenantId, role: 'student', name: ILike(`%${q}%`) },
      select: { id: true, name: true },
      take: 10,
      order: { name: 'ASC' },
    });
  }

  // ── Grade de horários por sala ──────────────────────────────────────────────

  getSchedules(tenantId: string, roomId: string) {
    return this.schedulesRepo.find({
      where: { tenantId, roomId },
      relations: { subject: true, teachers: { teacher: true } },
      order: { dayOfWeek: 'ASC', shift: 'ASC' },
    });
  }

  async upsertSchedule(tenantId: string, roomId: string, dto: UpsertRoomScheduleDto) {
    // verifica se a sala pertence ao tenant
    const room = await this.roomsRepo.findOne({ where: { tenantId, id: roomId } });
    if (!room) throw new NotFoundException('Sala não encontrada');

    // remove slot existente para o mesmo dia+turno (se houver) e recria
    const existing = await this.schedulesRepo.findOne({
      where: { tenantId, roomId, dayOfWeek: dto.dayOfWeek, shift: dto.shift as any },
    });
    if (existing) await this.schedulesRepo.remove(existing);

    const schedule = this.schedulesRepo.create({
      tenantId,
      roomId,
      dayOfWeek: dto.dayOfWeek,
      shift: dto.shift as any,
      subjectId: dto.subjectId ?? null,
    });
    const saved = await this.schedulesRepo.save(schedule);

    if (dto.teacherIds.length > 0) {
      const teachers = dto.teacherIds.map((teacherId) =>
        this.scheduleTeachersRepo.create({ scheduleId: saved.id, teacherId }),
      );
      await this.scheduleTeachersRepo.save(teachers);
    }

    return this.schedulesRepo.findOne({
      where: { id: saved.id },
      relations: { subject: true, teachers: { teacher: true } },
    });
  }

  async deleteSchedule(tenantId: string, scheduleId: string) {
    const schedule = await this.schedulesRepo.findOne({ where: { tenantId, id: scheduleId } });
    if (!schedule) throw new NotFoundException('Horário não encontrado');
    await this.schedulesRepo.remove(schedule);
  }
}

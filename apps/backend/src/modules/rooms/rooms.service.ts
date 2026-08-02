import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, IsNull, Repository } from 'typeorm';
import { Room } from './room.entity';
import { RoomCheckin } from './room-checkin.entity';
import { User } from '../auth/user.entity';
import { Session } from '../scheduling/session.entity';
import { Attendance } from '../attendance/attendance.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepo: Repository<Room>,
    @InjectRepository(RoomCheckin)
    private checkinsRepo: Repository<RoomCheckin>,
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
      relations: { fixedGroup: true, teacher: true, subject: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const room = await this.roomsRepo.findOne({
      where: { tenantId, id },
      relations: { fixedGroup: true, teacher: true, subject: true },
    });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return room;
  }

  async create(tenantId: string, dto: CreateRoomDto) {
    const room = this.roomsRepo.create({ ...dto, tenantId });
    return this.roomsRepo.save(room);
  }

  async update(tenantId: string, id: string, dto: UpdateRoomDto) {
    const room = await this.findOne(tenantId, id);
    Object.assign(room, dto);
    return this.roomsRepo.save(room);
  }

  async remove(tenantId: string, id: string) {
    const room = await this.findOne(tenantId, id);
    await this.roomsRepo.remove(room);
  }

  async getOccupancy(tenantId: string) {
    const rooms = await this.roomsRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
      relations: { teacher: true, subject: true },
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

  // ── Check-in de aluno ────────────────────────────────────────────────────────

  async getAvailableRooms(tenantId: string) {
    const rooms = await this.roomsRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
      relations: { teacher: true, subject: true },
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

    return rooms.map((room) => {
      const current = occupancy[room.id] ?? 0;
      return {
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        currentOccupancy: current,
        available: room.capacity - current,
        isFull: current >= room.capacity,
        teacher: room.teacher ? { id: room.teacher.id, name: room.teacher.name } : null,
        subject: room.subject ? { id: room.subject.id, name: room.subject.name } : null,
      };
    });
  }

  async checkin(tenantId: string, studentId: string, roomId: string) {
    const room = await this.findOne(tenantId, roomId);

    // auto-checkout de sala anterior se existir
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

    // se a sala tem professor e disciplina configurados, cria sessão + presença
    if (room.teacherId && room.subjectId) {
      this.createWalkInSession(tenantId, studentId, room).catch(() => {});
    }

    return { ...saved, room: { id: room.id, name: room.name, capacity: room.capacity } };
  }

  private async createWalkInSession(tenantId: string, studentId: string, room: Room) {
    const now = new Date();
    // janela: 90 min antes até 30 min depois do horário atual
    const windowStart = new Date(now.getTime() - 90 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 30 * 60 * 1000);

    // procura sessão agendada sem aluno para este professor+disciplina no horário
    const pending = await this.sessionsRepo.findOne({
      where: {
        tenantId,
        teacherId: room.teacherId!,
        subjectId: room.subjectId!,
        studentId: IsNull(),
        status: 'agendada' as any,
        scheduledAt: Between(windowStart, windowEnd),
      },
      order: { scheduledAt: 'ASC' },
    });

    let sessionId: string;

    if (pending) {
      // preenche o aluno na sessão pré-agendada
      pending.studentId = studentId;
      pending.roomId = room.id;
      pending.status = 'confirmada' as any;
      const updated = await this.sessionsRepo.save(pending);
      sessionId = updated.id;
    } else {
      // cria sessão walk-in nova
      const session = this.sessionsRepo.create({
        tenantId,
        teacherId: room.teacherId!,
        studentId,
        subjectId: room.subjectId!,
        roomId: room.id,
        scheduledAt: now,
        status: 'agendada' as any,
        channel: 'presencial',
      });
      const saved = await this.sessionsRepo.save(session);
      sessionId = saved.id;
    }

    // verifica se já existe presença para esta sessão+aluno antes de criar
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

  async kioskSearchStudents(tenantId: string, q: string) {
    if (!q || q.length < 2) return [];
    return this.usersRepo.find({
      where: { tenantId, role: 'student', name: ILike(`%${q}%`) },
      select: { id: true, name: true },
      take: 10,
      order: { name: 'ASC' },
    });
  }

  async getMyCheckin(tenantId: string, studentId: string) {
    const checkin = await this.checkinsRepo.findOne({
      where: { tenantId, studentId, checkoutAt: IsNull() },
      relations: { room: true },
    });
    return checkin ?? null;
  }

  async getActiveCheckins(tenantId: string) {
    const checkins = await this.checkinsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.room', 'room')
      .innerJoin('users', 'u', 'u.id = c.student_id AND u.tenant_id = c.tenant_id')
      .addSelect(['u.id', 'u.name'])
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.checkout_at IS NULL')
      .orderBy('c.checkin_at', 'ASC')
      .getRawMany();

    return checkins.map((row) => ({
      checkinId: row.c_id,
      checkinAt: row.c_checkin_at,
      studentId: row.u_id,
      studentName: row.u_name,
      roomId: row.room_id,
      roomName: row.room_name,
    }));
  }
}

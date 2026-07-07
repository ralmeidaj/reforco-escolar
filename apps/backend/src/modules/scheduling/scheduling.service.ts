import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { AvailabilitySlot } from './availability-slot.entity';
import { Session } from './session.entity';
import { Room } from '../rooms/room.entity';
import { CreateAvailabilitySlotDto } from './dto/create-availability-slot.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(AvailabilitySlot)
    private slotsRepo: Repository<AvailabilitySlot>,
    @InjectRepository(Session)
    private sessionsRepo: Repository<Session>,
    @InjectRepository(Room)
    private roomsRepo: Repository<Room>,
  ) {}

  // ── Availability Slots ────────────────────────────────────────────────────

  createSlot(tenantId: string, dto: CreateAvailabilitySlotDto) {
    const slot = this.slotsRepo.create({ ...dto, tenantId });
    return this.slotsRepo.save(slot);
  }

  findSlots(tenantId: string, teacherId?: string) {
    return this.slotsRepo.find({
      where: { tenantId, ...(teacherId ? { teacherId } : {}) },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async removeSlot(tenantId: string, id: string) {
    const slot = await this.slotsRepo.findOne({ where: { tenantId, id } });
    if (!slot) throw new NotFoundException('Horário não encontrado');
    await this.slotsRepo.remove(slot);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  async createSession(tenantId: string, dto: CreateSessionDto) {
    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime())) throw new BadRequestException('scheduledAt inválido');

    let roomId = dto.roomId ?? null;

    // Alocação automática de sala se não fornecida
    if (!roomId) {
      roomId = await this.allocateRoom(tenantId, scheduledAt);
    }

    const session = this.sessionsRepo.create({
      ...dto,
      tenantId,
      scheduledAt,
      roomId,
      channel: (dto.channel ?? 'presencial') as any,
    });
    return this.sessionsRepo.save(session);
  }

  findSessions(tenantId: string, from?: string, to?: string, teacherId?: string, studentId?: string) {
    const where: any = { tenantId };
    if (teacherId) where.teacherId = teacherId;
    if (studentId) where.studentId = studentId;
    if (from && to) {
      where.scheduledAt = Between(new Date(from), new Date(to));
    }
    return this.sessionsRepo.find({
      where,
      order: { scheduledAt: 'ASC' },
      relations: { teacher: true, student: true, subject: true, room: true },
    });
  }

  async findSession(tenantId: string, id: string) {
    const session = await this.sessionsRepo.findOne({
      where: { tenantId, id },
      relations: { teacher: true, student: true, subject: true, room: true },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    return session;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateSessionStatusDto) {
    const session = await this.sessionsRepo.findOne({ where: { tenantId, id } });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    if (dto.status === 'cancelada' && !dto.cancelReason) {
      throw new BadRequestException('cancelReason é obrigatório ao cancelar');
    }

    session.status = dto.status as any;
    if (dto.cancelReason) session.cancelReason = dto.cancelReason;
    return this.sessionsRepo.save(session);
  }

  async removeSession(tenantId: string, id: string) {
    const session = await this.sessionsRepo.findOne({ where: { tenantId, id } });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    await this.sessionsRepo.remove(session);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async allocateRoom(tenantId: string, scheduledAt: Date): Promise<string | null> {
    const rooms = await this.roomsRepo.find({
      where: { tenantId, fixedGroupId: IsNull() },
      order: { capacity: 'ASC' },
    });

    if (rooms.length === 0) return null;

    const windowStart = new Date(scheduledAt.getTime() - 30 * 60 * 1000);
    const windowEnd   = new Date(scheduledAt.getTime() + 30 * 60 * 1000);

    // Conta quantas sessões ativas cada sala tem no mesmo horário
    const occupancies: Array<{ room_id: string; cnt: string }> = await this.sessionsRepo
      .createQueryBuilder('s')
      .select('s.room_id', 'room_id')
      .addSelect('COUNT(*)', 'cnt')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.scheduled_at BETWEEN :start AND :end', { start: windowStart, end: windowEnd })
      .andWhere('s.status IN (:...statuses)', { statuses: ['agendada', 'confirmada'] })
      .andWhere('s.room_id IS NOT NULL')
      .groupBy('s.room_id')
      .getRawMany();

    const countMap = Object.fromEntries(occupancies.map((r) => [r.room_id, Number(r.cnt)]));

    // Escolhe a sala com menor ocupação atual e que ainda tem espaço
    const available = rooms
      .filter((r) => (countMap[r.id] ?? 0) < r.capacity)
      .sort((a, b) => (countMap[a.id] ?? 0) - (countMap[b.id] ?? 0));

    return available[0]?.id ?? null;
  }
}

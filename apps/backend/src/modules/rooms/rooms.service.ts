import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { Room } from './room.entity';
import { RoomCheckin } from './room-checkin.entity';
import { User } from '../auth/user.entity';
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
  ) {}

  findAll(tenantId: string) {
    return this.roomsRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
      relations: { fixedGroup: true },
    });
  }

  async findOne(tenantId: string, id: string) {
    const room = await this.roomsRepo.findOne({
      where: { tenantId, id },
      relations: { fixedGroup: true },
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
    const rooms = await this.roomsRepo.find({ where: { tenantId }, order: { name: 'ASC' } });

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
    const rooms = await this.roomsRepo.find({ where: { tenantId }, order: { name: 'ASC' } });

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
    return { ...saved, room: { id: room.id, name: room.name, capacity: room.capacity } };
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
      select: ['id', 'name'],
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
}

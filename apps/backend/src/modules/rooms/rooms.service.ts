import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepo: Repository<Room>,
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
}

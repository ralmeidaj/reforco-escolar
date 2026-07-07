import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement) private readonly repo: Repository<Announcement>,
  ) {}

  async create(tenantId: string, createdById: string, dto: CreateAnnouncementDto): Promise<Announcement> {
    const ann = this.repo.create({
      tenantId,
      createdById,
      title: dto.title,
      content: dto.content,
      targetRoles: dto.targetRoles ?? [],
    });
    return this.repo.save(ann);
  }

  async findAll(tenantId: string): Promise<Announcement[]> {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findForRole(tenantId: string, role: string): Promise<Announcement[]> {
    return this.repo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('(a.target_roles = \'{}\' OR :role = ANY(a.target_roles))', { role })
      .orderBy('a.created_at', 'DESC')
      .getMany();
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const ann = await this.repo.findOne({ where: { tenantId, id } });
    if (!ann) throw new NotFoundException('Aviso não encontrado');
    await this.repo.remove(ann);
  }
}

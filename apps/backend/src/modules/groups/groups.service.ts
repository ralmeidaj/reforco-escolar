import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepo: Repository<Group>,
  ) {}

  findAll(tenantId: string) {
    return this.groupsRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async findOne(tenantId: string, id: string) {
    const group = await this.groupsRepo.findOne({ where: { tenantId, id } });
    if (!group) throw new NotFoundException('Turma não encontrada');
    return group;
  }

  async create(tenantId: string, dto: CreateGroupDto) {
    const group = this.groupsRepo.create({ ...dto, tenantId });
    return this.groupsRepo.save(group);
  }

  async update(tenantId: string, id: string, dto: UpdateGroupDto) {
    const group = await this.findOne(tenantId, id);
    Object.assign(group, dto);
    return this.groupsRepo.save(group);
  }

  async remove(tenantId: string, id: string) {
    const group = await this.findOne(tenantId, id);
    await this.groupsRepo.remove(group);
  }
}

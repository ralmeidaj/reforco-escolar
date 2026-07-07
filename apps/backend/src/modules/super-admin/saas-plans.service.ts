import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaasPlan } from './saas-plan.entity';
import { CreateSaasPlanDto, UpdateSaasPlanDto } from './dto/manage-tenant.dto';

@Injectable()
export class SaasPlansService {
  constructor(
    @InjectRepository(SaasPlan) private repo: Repository<SaasPlan>,
  ) {}

  findAll() {
    return this.repo.find({ where: { active: true }, order: { priceMonthly: 'ASC' } });
  }

  async findOne(id: string) {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    return plan;
  }

  create(dto: CreateSaasPlanDto) {
    const plan = this.repo.create(dto as any);
    return this.repo.save(plan);
  }

  async update(id: string, dto: UpdateSaasPlanDto) {
    const plan = await this.findOne(id);
    Object.assign(plan, dto);
    return this.repo.save(plan);
  }

  async remove(id: string) {
    const plan = await this.findOne(id);
    plan.active = false;
    return this.repo.save(plan);
  }
}

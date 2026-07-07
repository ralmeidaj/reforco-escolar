import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepo: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const exists = await this.tenantsRepo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('Slug já está em uso');

    const tenant = this.tenantsRepo.create(dto);
    return this.tenantsRepo.save(tenant);
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantsRepo.findOne({ where: { slug, status: 'active' } });
  }
}

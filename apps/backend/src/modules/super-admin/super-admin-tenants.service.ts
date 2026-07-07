import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { SaasPlan } from './saas-plan.entity';
import { UpdateTenantStatusDto, AssignSaasPlanDto, CreateTenantByAdminDto, UpdateTenantDto } from './dto/manage-tenant.dto';

@Injectable()
export class SuperAdminTenantsService {
  constructor(
    @InjectRepository(Tenant) private tenantsRepo: Repository<Tenant>,
    @InjectRepository(SaasPlan) private plansRepo: Repository<SaasPlan>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async createTenant(dto: CreateTenantByAdminDto) {
    const slugExists = await this.tenantsRepo.findOne({ where: { slug: dto.slug } });
    if (slugExists) throw new ConflictException('Slug já está em uso');

    const tenant = await this.tenantsRepo.save(
      this.tenantsRepo.create({ name: dto.name, slug: dto.slug }),
    );

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    await this.usersRepo.save(
      this.usersRepo.create({
        tenantId: tenant.id,
        name: dto.name,
        email: dto.adminEmail,
        passwordHash,
        role: 'tenant_admin',
        emailVerified: true,
      }),
    );

    return tenant;
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    const tenant = await this.findOne(id);
    if (dto.slug && dto.slug !== tenant.slug) {
      const slugExists = await this.tenantsRepo.findOne({ where: { slug: dto.slug } });
      if (slugExists) throw new ConflictException('Slug já está em uso');
    }
    if (dto.name) tenant.name = dto.name;
    if (dto.slug) tenant.slug = dto.slug;
    await this.tenantsRepo.save(tenant);

    let adminEmail: string | null = null;
    const admin = await this.usersRepo.findOne({ where: { tenantId: id, role: 'tenant_admin' as any } });
    if (admin) {
      if (dto.adminEmail) {
        admin.email = dto.adminEmail;
      }
      if (dto.adminPassword) {
        admin.passwordHash = await bcrypt.hash(dto.adminPassword, 10);
      }
      if (dto.adminEmail || dto.adminPassword) {
        await this.usersRepo.save(admin);
      }
      adminEmail = admin.email;
    }

    return { ...tenant, adminEmail };
  }

  async findAll(page = 1, limit = 20) {
    const tenants = await this.tenantsRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const admins = await this.usersRepo.find({
      where: tenants.map((t) => ({ tenantId: t.id, role: 'tenant_admin' as any })),
      select: { tenantId: true, email: true },
    });

    const adminMap = Object.fromEntries(admins.map((a) => [a.tenantId, a.email]));
    return tenants.map((t) => ({ ...t, adminEmail: adminMap[t.id] ?? null }));
  }

  async findOne(id: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async updateStatus(id: string, dto: UpdateTenantStatusDto) {
    const tenant = await this.findOne(id);
    if (dto.status === 'deleted') {
      tenant.status = 'deleted';
      tenant.saasStatus = 'deleted';
    } else {
      tenant.saasStatus = dto.status;
      tenant.status = dto.status as any;
    }
    return this.tenantsRepo.save(tenant);
  }

  async assignPlan(id: string, dto: AssignSaasPlanDto) {
    const tenant = await this.findOne(id);
    const plan = await this.plansRepo.findOne({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plano não encontrado');

    tenant.saasPlanId = dto.planId;
    return this.tenantsRepo.save(tenant);
  }

  async impersonate(tenantId: string, adminId: string) {
    const tenant = await this.findOne(tenantId);
    if (tenant.status !== 'active') throw new BadRequestException('Tenant não está ativo');

    // Token de impersonation: curta duração (1h), sem refresh, role tenant_admin
    const token = this.jwtService.sign(
      {
        sub: `impersonation:${adminId}`,
        email: `superadmin@impersonating`,
        role: 'tenant_admin',
        tenantId,
        impersonatedBy: adminId,
      },
      { expiresIn: '1h' },
    );

    return { accessToken: token, tenantSlug: tenant.slug };
  }

  async getStats() {
    const total = await this.tenantsRepo.count();
    const active = await this.tenantsRepo.count({ where: { status: 'active' } });
    const suspended = await this.tenantsRepo.count({ where: { status: 'suspended' } });
    return { total, active, suspended, deleted: total - active - suspended };
  }
}

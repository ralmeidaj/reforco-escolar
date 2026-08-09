import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantSecretsCipherService } from '../../common/crypto/tenant-secrets-cipher.service';

export interface OpenAiKeyStatus {
  hasKey: boolean;
  keyPreview: string | null;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepo: Repository<Tenant>,
    private readonly cipher: TenantSecretsCipherService,
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

  findById(id: string): Promise<Tenant | null> {
    return this.tenantsRepo.findOne({ where: { id } });
  }

  async setOpenAiKey(tenantId: string, apiKey: string): Promise<OpenAiKeyStatus> {
    const keyPreview = apiKey.slice(-4);
    await this.tenantsRepo.update(tenantId, { openaiApiKeyEncrypted: this.cipher.encrypt(apiKey) });
    return { hasKey: true, keyPreview };
  }

  async removeOpenAiKey(tenantId: string): Promise<void> {
    await this.tenantsRepo.update(tenantId, { openaiApiKeyEncrypted: null });
  }

  async getOpenAiKeyStatus(tenantId: string): Promise<OpenAiKeyStatus> {
    const tenant = await this.findById(tenantId);
    if (!tenant?.openaiApiKeyEncrypted) return { hasKey: false, keyPreview: null };

    try {
      const apiKey = this.cipher.decrypt(tenant.openaiApiKeyEncrypted);
      return { hasKey: true, keyPreview: apiKey.slice(-4) };
    } catch {
      return { hasKey: true, keyPreview: null };
    }
  }
}

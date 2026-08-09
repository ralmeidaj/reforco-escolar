import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Tenant } from '../../modules/tenants/tenant.entity';
import { TenantSecretsCipherService } from '../crypto/tenant-secrets-cipher.service';

@Injectable()
export class OpenAiClientResolver {
  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    private readonly cipher: TenantSecretsCipherService,
    private readonly config: ConfigService,
  ) {}

  async getClient(tenantId: string): Promise<OpenAI | null> {
    const apiKey = await this.resolveApiKey(tenantId);
    return apiKey ? new OpenAI({ apiKey }) : null;
  }

  private async resolveApiKey(tenantId: string): Promise<string | null> {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (tenant?.openaiApiKeyEncrypted) {
      try {
        return this.cipher.decrypt(tenant.openaiApiKeyEncrypted);
      } catch {
        // chave mestra rotacionada ou ciphertext corrompido — cai pra chave global
      }
    }
    return this.config.get<string>('OPENAI_API_KEY') ?? null;
  }
}

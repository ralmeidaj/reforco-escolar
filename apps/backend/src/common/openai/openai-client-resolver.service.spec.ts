import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { OpenAiClientResolver } from './openai-client-resolver.service';
import { TenantSecretsCipherService } from '../crypto/tenant-secrets-cipher.service';
import { Tenant } from '../../modules/tenants/tenant.entity';

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((config: any) => config),
}));

const TEST_KEY_HEX = 'b'.repeat(64);

const mockTenantsRepo = { findOne: jest.fn() };

describe('OpenAiClientResolver', () => {
  let resolver: OpenAiClientResolver;
  let cipher: TenantSecretsCipherService;
  const mockConfig = {
    get: jest.fn(),
    getOrThrow: jest.fn().mockReturnValue(TEST_KEY_HEX),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfig.getOrThrow.mockReturnValue(TEST_KEY_HEX);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiClientResolver,
        TenantSecretsCipherService,
        { provide: getRepositoryToken(Tenant), useValue: mockTenantsRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    resolver = module.get(OpenAiClientResolver);
    cipher = module.get(TenantSecretsCipherService);
  });

  it('usa a chave própria do tenant quando configurada, mesmo com chave global setada', async () => {
    mockTenantsRepo.findOne.mockResolvedValue({ openaiApiKeyEncrypted: cipher.encrypt('sk-tenant-key') });
    mockConfig.get.mockReturnValue('sk-global-key');

    const client = await resolver.getClient('tenant-1');

    expect((client as any)?.apiKey).toBe('sk-tenant-key');
  });

  it('cai pra chave global quando o tenant não tem chave própria', async () => {
    mockTenantsRepo.findOne.mockResolvedValue({ openaiApiKeyEncrypted: null });
    mockConfig.get.mockReturnValue('sk-global-key');

    const client = await resolver.getClient('tenant-1');

    expect((client as any)?.apiKey).toBe('sk-global-key');
  });

  it('retorna null quando não há chave própria nem global', async () => {
    mockTenantsRepo.findOne.mockResolvedValue(null);
    mockConfig.get.mockReturnValue(undefined);

    const client = await resolver.getClient('tenant-1');

    expect(client).toBeNull();
  });

  it('cai pra chave global quando o decrypt da chave do tenant falha (chave mestra diferente)', async () => {
    const otherModule: TestingModule = await Test.createTestingModule({
      providers: [
        TenantSecretsCipherService,
        { provide: ConfigService, useValue: { getOrThrow: jest.fn().mockReturnValue('c'.repeat(64)) } },
      ],
    }).compile();
    const otherCipher = otherModule.get(TenantSecretsCipherService);

    mockTenantsRepo.findOne.mockResolvedValue({ openaiApiKeyEncrypted: otherCipher.encrypt('sk-tenant-key') });
    mockConfig.get.mockReturnValue('sk-global-key');

    const client = await resolver.getClient('tenant-1');

    expect((client as any)?.apiKey).toBe('sk-global-key');
  });
});

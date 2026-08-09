import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TenantSecretsCipherService } from './tenant-secrets-cipher.service';

const TEST_KEY_HEX = 'a'.repeat(64); // 32 bytes válidos

describe('TenantSecretsCipherService', () => {
  async function build(configValue: string): Promise<TenantSecretsCipherService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantSecretsCipherService,
        { provide: ConfigService, useValue: { getOrThrow: jest.fn().mockReturnValue(configValue) } },
      ],
    }).compile();
    return module.get(TenantSecretsCipherService);
  }

  it('faz roundtrip de encrypt/decrypt', async () => {
    const service = await build(TEST_KEY_HEX);
    const ciphertext = service.encrypt('sk-fake-openai-key-123');
    expect(service.decrypt(ciphertext)).toBe('sk-fake-openai-key-123');
  });

  it('lança na construção se a chave mestra não tiver 32 bytes', async () => {
    await expect(build('chave-curta-demais')).rejects.toThrow();
  });
});

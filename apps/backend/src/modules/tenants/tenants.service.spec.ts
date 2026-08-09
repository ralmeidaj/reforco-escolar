import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './tenant.entity';
import { TenantSecretsCipherService } from '../../common/crypto/tenant-secrets-cipher.service';

const mockRepo = {
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn(),
  update: jest.fn(),
};

const mockCipher = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: mockRepo },
        { provide: TenantSecretsCipherService, useValue: mockCipher },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  describe('create', () => {
    it('cria tenant com slug único', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue({ id: 'tenant-1', slug: 'escola-silva', name: 'Escola Silva', status: 'active' });

      const result = await service.create({ slug: 'escola-silva', name: 'Escola Silva' });

      expect(result.slug).toBe('escola-silva');
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('lança ConflictException se slug já existe', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'existing', slug: 'escola-silva' });

      await expect(
        service.create({ slug: 'escola-silva', name: 'Escola Silva 2' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findBySlug', () => {
    it('retorna tenant existente', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'tenant-1', slug: 'escola-silva' });

      const result = await service.findBySlug('escola-silva');
      expect(result?.slug).toBe('escola-silva');
    });

    it('retorna undefined se não encontrado', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.findBySlug('nao-existe');
      expect(result).toBeNull();
    });
  });

  describe('setOpenAiKey', () => {
    it('criptografa a chave e salva, retornando preview dos últimos 4 caracteres', async () => {
      mockCipher.encrypt.mockReturnValue('ciphertext-fake');

      const result = await service.setOpenAiKey('tenant-1', 'sk-fake-openai-key-1234');

      expect(mockCipher.encrypt).toHaveBeenCalledWith('sk-fake-openai-key-1234');
      expect(mockRepo.update).toHaveBeenCalledWith('tenant-1', { openaiApiKeyEncrypted: 'ciphertext-fake' });
      expect(result).toEqual({ hasKey: true, keyPreview: '1234' });
    });
  });

  describe('removeOpenAiKey', () => {
    it('limpa a coluna de chave criptografada', async () => {
      await service.removeOpenAiKey('tenant-1');

      expect(mockRepo.update).toHaveBeenCalledWith('tenant-1', { openaiApiKeyEncrypted: null });
    });
  });

  describe('getOpenAiKeyStatus', () => {
    it('retorna hasKey false quando o tenant não tem chave própria', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'tenant-1', openaiApiKeyEncrypted: null });

      const result = await service.getOpenAiKeyStatus('tenant-1');

      expect(result).toEqual({ hasKey: false, keyPreview: null });
      expect(mockCipher.decrypt).not.toHaveBeenCalled();
    });

    it('decifra e retorna o preview quando o tenant tem chave própria', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'tenant-1', openaiApiKeyEncrypted: 'ciphertext-fake' });
      mockCipher.decrypt.mockReturnValue('sk-fake-openai-key-5678');

      const result = await service.getOpenAiKeyStatus('tenant-1');

      expect(result).toEqual({ hasKey: true, keyPreview: '5678' });
    });

    it('retorna hasKey true com keyPreview null quando o decrypt falha', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'tenant-1', openaiApiKeyEncrypted: 'ciphertext-corrompido' });
      mockCipher.decrypt.mockImplementation(() => { throw new Error('auth tag mismatch'); });

      const result = await service.getOpenAiKeyStatus('tenant-1');

      expect(result).toEqual({ hasKey: true, keyPreview: null });
    });
  });
});

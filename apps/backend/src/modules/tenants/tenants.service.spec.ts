import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './tenant.entity';

const mockRepo = {
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn(),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(Tenant), useValue: mockRepo },
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
});

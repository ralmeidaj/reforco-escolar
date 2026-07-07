import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SuperAdminTenantsService } from './super-admin-tenants.service';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { SaasPlan } from './saas-plan.entity';

const mockTenantsRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn((e) => Promise.resolve(e)),
  create: jest.fn((e) => e),
  count: jest.fn(),
};

const mockPlansRepo = {
  findOne: jest.fn(),
};

const mockUsersRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn((e) => Promise.resolve(e)),
  create: jest.fn((e) => e),
};

const mockJwt = { sign: jest.fn().mockReturnValue('impersonation-token') };

describe('SuperAdminTenantsService', () => {
  let service: SuperAdminTenantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminTenantsService,
        { provide: getRepositoryToken(Tenant), useValue: mockTenantsRepo },
        { provide: getRepositoryToken(SaasPlan), useValue: mockPlansRepo },
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get(SuperAdminTenantsService);
    jest.clearAllMocks();
  });

  describe('updateStatus', () => {
    it('deve suspender um tenant', async () => {
      const tenant = { id: '1', status: 'active', saasStatus: 'active' };
      mockTenantsRepo.findOne.mockResolvedValue(tenant);

      await service.updateStatus('1', { status: 'suspended' });

      expect(mockTenantsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended' }));
    });

    it('deve lançar NotFoundException para tenant inexistente', async () => {
      mockTenantsRepo.findOne.mockResolvedValue(null);
      await expect(service.updateStatus('bad', { status: 'suspended' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignPlan', () => {
    it('deve atribuir plano ao tenant', async () => {
      mockTenantsRepo.findOne.mockResolvedValue({ id: '1', saasPlanId: null });
      mockPlansRepo.findOne.mockResolvedValue({ id: 'plan-1', name: 'Pro' });

      await service.assignPlan('1', { planId: 'plan-1' });

      expect(mockTenantsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ saasPlanId: 'plan-1' }));
    });

    it('deve lançar NotFoundException para plano inexistente', async () => {
      mockTenantsRepo.findOne.mockResolvedValue({ id: '1' });
      mockPlansRepo.findOne.mockResolvedValue(null);

      await expect(service.assignPlan('1', { planId: 'bad' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('impersonate', () => {
    it('deve gerar token de impersonation para tenant ativo', async () => {
      mockTenantsRepo.findOne.mockResolvedValue({ id: '1', status: 'active', slug: 'escola-silva' });

      const result = await service.impersonate('1', 'admin-1');

      expect(result).toEqual({ accessToken: 'impersonation-token', tenantSlug: 'escola-silva' });
    });

    it('deve lançar BadRequestException para tenant inativo', async () => {
      mockTenantsRepo.findOne.mockResolvedValue({ id: '1', status: 'suspended' });

      await expect(service.impersonate('1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('deve retornar estatísticas de tenants', async () => {
      mockTenantsRepo.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(2);

      const stats = await service.getStats();

      expect(stats).toEqual({ total: 10, active: 7, suspended: 2, deleted: 1 });
    });
  });
});

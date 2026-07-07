import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Group } from './group.entity';

const mockGroupsRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('GroupsService', () => {
  let service: GroupsService;

  const TENANT = 'tenant-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(Group), useValue: mockGroupsRepo },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  describe('findAll', () => {
    it('retorna lista de turmas ordenada por nome', async () => {
      const groups = [
        { id: 'g1', name: '5º Ano A', level: 'fundamental', tenantId: TENANT },
        { id: 'g2', name: 'Infantil B', level: 'infantil', tenantId: TENANT },
      ];
      mockGroupsRepo.find.mockResolvedValue(groups);
      const result = await service.findAll(TENANT);
      expect(result).toEqual(groups);
      expect(mockGroupsRepo.find).toHaveBeenCalledWith({ where: { tenantId: TENANT }, order: { name: 'ASC' } });
    });
  });

  describe('findOne', () => {
    it('retorna a turma se encontrada', async () => {
      const group = { id: 'g1', name: '5º Ano A', tenantId: TENANT };
      mockGroupsRepo.findOne.mockResolvedValue(group);
      const result = await service.findOne(TENANT, 'g1');
      expect(result).toEqual(group);
    });

    it('lança NotFoundException se turma não existe', async () => {
      mockGroupsRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('cria e retorna a nova turma', async () => {
      const dto = { name: '3º Ano B', level: 'fundamental' };
      const saved = { id: 'g3', ...dto, tenantId: TENANT };
      mockGroupsRepo.save.mockResolvedValue(saved);
      const result = await service.create(TENANT, dto);
      expect(result).toEqual(saved);
      expect(mockGroupsRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('atualiza nome e nível da turma', async () => {
      const group = { id: 'g1', name: '5º Ano A', level: 'fundamental', tenantId: TENANT };
      mockGroupsRepo.findOne.mockResolvedValue(group);
      mockGroupsRepo.save.mockResolvedValue({ ...group, name: '5º Ano B' });
      const result = await service.update(TENANT, 'g1', { name: '5º Ano B' });
      expect(result.name).toBe('5º Ano B');
    });

    it('lança NotFoundException se turma não existe', async () => {
      mockGroupsRepo.findOne.mockResolvedValue(null);
      await expect(service.update(TENANT, 'nao-existe', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('remove a turma se encontrada', async () => {
      const group = { id: 'g1', name: '5º Ano A', tenantId: TENANT };
      mockGroupsRepo.findOne.mockResolvedValue(group);
      mockGroupsRepo.remove.mockResolvedValue(undefined);
      await service.remove(TENANT, 'g1');
      expect(mockGroupsRepo.remove).toHaveBeenCalledWith(group);
    });

    it('lança NotFoundException se turma não existe', async () => {
      mockGroupsRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });
});

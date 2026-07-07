import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { Room } from './room.entity';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  }),
});

describe('RoomsService', () => {
  let service: RoomsService;
  let roomsRepo: ReturnType<typeof makeRepo>;

  const TENANT = 'tenant-1';

  beforeEach(async () => {
    roomsRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: getRepositoryToken(Room), useValue: roomsRepo },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  describe('findAll', () => {
    it('retorna lista de salas do tenant', async () => {
      const rooms = [{ id: 'r1', name: 'Sala 01', capacity: 10, tenantId: TENANT }];
      roomsRepo.find.mockResolvedValue(rooms);
      const result = await service.findAll(TENANT);
      expect(result).toEqual(rooms);
      expect(roomsRepo.find).toHaveBeenCalledWith({
        where: { tenantId: TENANT },
        order: { name: 'ASC' },
        relations: { fixedGroup: true },
      });
    });
  });

  describe('findOne', () => {
    it('retorna a sala se encontrada', async () => {
      const room = { id: 'r1', name: 'Sala 01', tenantId: TENANT };
      roomsRepo.findOne.mockResolvedValue(room);
      const result = await service.findOne(TENANT, 'r1');
      expect(result).toEqual(room);
    });

    it('lança NotFoundException se sala não existe', async () => {
      roomsRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('cria e salva a sala', async () => {
      const dto = { name: 'Sala 02', capacity: 5 };
      const saved = { id: 'r2', ...dto, tenantId: TENANT };
      roomsRepo.save.mockResolvedValue(saved);
      const result = await service.create(TENANT, dto);
      expect(result).toEqual(saved);
    });
  });

  describe('update', () => {
    it('atualiza a capacidade da sala', async () => {
      const room = { id: 'r1', name: 'Sala 01', capacity: 10, tenantId: TENANT };
      roomsRepo.findOne.mockResolvedValue(room);
      roomsRepo.save.mockResolvedValue({ ...room, capacity: 15 });
      const result = await service.update(TENANT, 'r1', { capacity: 15 });
      expect(result.capacity).toBe(15);
    });

    it('lança NotFoundException se sala não existe', async () => {
      roomsRepo.findOne.mockResolvedValue(null);
      await expect(service.update(TENANT, 'nao-existe', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('remove a sala se encontrada', async () => {
      const room = { id: 'r1', name: 'Sala 01', tenantId: TENANT };
      roomsRepo.findOne.mockResolvedValue(room);
      await service.remove(TENANT, 'r1');
      expect(roomsRepo.remove).toHaveBeenCalledWith(room);
    });

    it('lança NotFoundException se sala não existe', async () => {
      roomsRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOccupancy', () => {
    it('retorna salas com currentOccupancy zerado quando não há sessões ativas', async () => {
      const rooms = [{ id: 'r1', name: 'Sala 01', capacity: 10, tenantId: TENANT }];
      roomsRepo.find.mockResolvedValue(rooms);
      // getRawMany já mockado para retornar []
      const result = await service.getOccupancy(TENANT);
      expect(result[0].currentOccupancy).toBe(0);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { AvailabilitySlot } from './availability-slot.entity';
import { Session } from './session.entity';
import { Room } from '../rooms/room.entity';

const makeQb = () => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
});

const makeSlotsRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn(),
  remove: jest.fn(),
});

const makeSessionsRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQb()),
});

const makeRoomsRepo = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
});

describe('SchedulingService', () => {
  let service: SchedulingService;
  let slotsRepo: ReturnType<typeof makeSlotsRepo>;
  let sessionsRepo: ReturnType<typeof makeSessionsRepo>;
  let roomsRepo: ReturnType<typeof makeRoomsRepo>;

  const TENANT = 'tenant-1';

  beforeEach(async () => {
    slotsRepo = makeSlotsRepo();
    sessionsRepo = makeSessionsRepo();
    roomsRepo = makeRoomsRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: getRepositoryToken(AvailabilitySlot), useValue: slotsRepo },
        { provide: getRepositoryToken(Session), useValue: sessionsRepo },
        { provide: getRepositoryToken(Room), useValue: roomsRepo },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
  });

  // ── Availability Slots ────────────────────────────────────────────────────

  describe('createSlot', () => {
    it('cria e retorna o slot', async () => {
      const dto = { teacherId: 'u1', dayOfWeek: 1, startTime: '08:00', endTime: '09:00' };
      const saved = { id: 'sl1', ...dto, tenantId: TENANT };
      slotsRepo.save.mockResolvedValue(saved);
      const result = await service.createSlot(TENANT, dto);
      expect(result).toEqual(saved);
    });
  });

  describe('findSlots', () => {
    it('busca slots do tenant com filtro de professor', async () => {
      slotsRepo.find.mockResolvedValue([]);
      await service.findSlots(TENANT, 'u1');
      expect(slotsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT, teacherId: 'u1' } }),
      );
    });
  });

  describe('removeSlot', () => {
    it('remove slot existente', async () => {
      const slot = { id: 'sl1', tenantId: TENANT };
      slotsRepo.findOne.mockResolvedValue(slot);
      await service.removeSlot(TENANT, 'sl1');
      expect(slotsRepo.remove).toHaveBeenCalledWith(slot);
    });

    it('lança NotFoundException se slot não existe', async () => {
      slotsRepo.findOne.mockResolvedValue(null);
      await expect(service.removeSlot(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Sessions ──────────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('cria sessão com data válida', async () => {
      const dto = {
        teacherId: 'u1', studentId: 'u2', subjectId: 's1',
        scheduledAt: '2025-05-01T08:00:00.000Z', durationMinutes: 60,
      };
      const saved = { id: 'sess1', ...dto, tenantId: TENANT, status: 'agendada' };
      sessionsRepo.save.mockResolvedValue(saved);
      const result = await service.createSession(TENANT, dto);
      expect(result.id).toBe('sess1');
    });

    it('lança BadRequestException com scheduledAt inválido', async () => {
      await expect(
        service.createSession(TENANT, {
          teacherId: 'u1', studentId: 'u2', subjectId: 's1', scheduledAt: 'nao-e-data',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findSession', () => {
    it('retorna sessão se encontrada', async () => {
      const session = { id: 'sess1', tenantId: TENANT };
      sessionsRepo.findOne.mockResolvedValue(session);
      const result = await service.findSession(TENANT, 'sess1');
      expect(result).toEqual(session);
    });

    it('lança NotFoundException se sessão não existe', async () => {
      sessionsRepo.findOne.mockResolvedValue(null);
      await expect(service.findSession(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('atualiza status para confirmada', async () => {
      const session = { id: 'sess1', tenantId: TENANT, status: 'agendada', cancelReason: null };
      sessionsRepo.findOne.mockResolvedValue(session);
      sessionsRepo.save.mockResolvedValue({ ...session, status: 'confirmada' });
      const result = await service.updateStatus(TENANT, 'sess1', { status: 'confirmada' });
      expect(result.status).toBe('confirmada');
    });

    it('lança BadRequestException ao cancelar sem motivo', async () => {
      sessionsRepo.findOne.mockResolvedValue({ id: 'sess1', tenantId: TENANT, status: 'agendada' });
      await expect(
        service.updateStatus(TENANT, 'sess1', { status: 'cancelada' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cancela com motivo', async () => {
      const session = { id: 'sess1', tenantId: TENANT, status: 'agendada', cancelReason: null };
      sessionsRepo.findOne.mockResolvedValue(session);
      sessionsRepo.save.mockResolvedValue({ ...session, status: 'cancelada', cancelReason: 'Doença' });
      const result = await service.updateStatus(TENANT, 'sess1', { status: 'cancelada', cancelReason: 'Doença' });
      expect(result.status).toBe('cancelada');
      expect(result.cancelReason).toBe('Doença');
    });

    it('lança NotFoundException se sessão não existe', async () => {
      sessionsRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus(TENANT, 'nao-existe', { status: 'confirmada' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeSession', () => {
    it('remove sessão existente', async () => {
      const session = { id: 'sess1', tenantId: TENANT };
      sessionsRepo.findOne.mockResolvedValue(session);
      await service.removeSession(TENANT, 'sess1');
      expect(sessionsRepo.remove).toHaveBeenCalledWith(session);
    });

    it('lança NotFoundException se sessão não existe', async () => {
      sessionsRepo.findOne.mockResolvedValue(null);
      await expect(service.removeSession(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });
});

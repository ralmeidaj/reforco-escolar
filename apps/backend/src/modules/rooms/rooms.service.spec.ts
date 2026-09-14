import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { RoomsService } from './rooms.service';
import { Room } from './room.entity';
import { RoomAssignment } from './room-assignment.entity';
import { RoomCheckin } from './room-checkin.entity';
import { RoomSchedule } from './room-schedule.entity';
import { RoomScheduleTeacher } from './room-schedule-teacher.entity';
import { User } from '../auth/user.entity';
import { Session } from '../scheduling/session.entity';
import { Attendance } from '../attendance/attendance.entity';

const makeQb = () => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
});

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
});

describe('RoomsService', () => {
  let service: RoomsService;
  let roomsRepo: ReturnType<typeof makeRepo>;
  let checkinsRepo: ReturnType<typeof makeRepo>;

  const TENANT = 'tenant-1';

  beforeEach(async () => {
    roomsRepo = makeRepo();
    checkinsRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: getRepositoryToken(Room),                useValue: roomsRepo },
        { provide: getRepositoryToken(RoomAssignment),      useValue: makeRepo() },
        { provide: getRepositoryToken(RoomCheckin),         useValue: checkinsRepo },
        { provide: getRepositoryToken(RoomSchedule),        useValue: makeRepo() },
        { provide: getRepositoryToken(RoomScheduleTeacher), useValue: makeRepo() },
        { provide: getRepositoryToken(User),                useValue: makeRepo() },
        { provide: getRepositoryToken(Session),             useValue: makeRepo() },
        { provide: getRepositoryToken(Attendance),          useValue: makeRepo() },
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
        relations: { fixedGroup: true, assignments: { teacher: true, subject: true } },
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
      const rooms = [{ id: 'r1', name: 'Sala 01', capacity: 10, tenantId: TENANT, assignments: [] }];
      roomsRepo.find.mockResolvedValue(rooms);
      // createQueryBuilder já mockado para retornar getRawMany: []
      const result = await service.getOccupancy(TENANT);
      expect(result[0].currentOccupancy).toBe(0);
    });
  });

  describe('checkin', () => {
    it('lança BadRequestException se a sala estiver sem vagas', async () => {
      roomsRepo.findOne.mockResolvedValue({ id: 'r1', tenantId: TENANT, capacity: 1, assignments: [] });
      checkinsRepo.update.mockResolvedValue({ affected: 0 });
      checkinsRepo.count.mockResolvedValue(1);

      await expect(service.checkin(TENANT, 'aluno-1', 'r1')).rejects.toThrow(BadRequestException);
    });

    it('faz auto-checkout de sala anterior e cria o check-in quando há vaga', async () => {
      roomsRepo.findOne.mockResolvedValue({ id: 'r1', tenantId: TENANT, name: 'Sala 01', capacity: 5, assignments: [] });
      checkinsRepo.update.mockResolvedValue({ affected: 1 });
      checkinsRepo.count.mockResolvedValue(0);
      checkinsRepo.save.mockResolvedValue({ id: 'checkin-1', tenantId: TENANT, roomId: 'r1', studentId: 'aluno-1' });

      const result = await service.checkin(TENANT, 'aluno-1', 'r1');

      expect(checkinsRepo.update).toHaveBeenCalledWith(
        { tenantId: TENANT, studentId: 'aluno-1', checkoutAt: IsNull() },
        { checkoutAt: expect.any(Date) },
      );
      expect(checkinsRepo.save).toHaveBeenCalledTimes(1);
      expect(result.room).toEqual({ id: 'r1', name: 'Sala 01', capacity: 5 });
    });
  });

  describe('kioskSearchCheckedIn', () => {
    it('retorna [] sem consultar o banco se a busca tiver menos de 2 caracteres', async () => {
      const result = await service.kioskSearchCheckedIn(TENANT, 'j');
      expect(result).toEqual([]);
      expect(checkinsRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('retorna alunos com check-in ativo mapeados com nome e sala', async () => {
      const qb = checkinsRepo.createQueryBuilder();
      (qb.getRawMany as jest.Mock).mockResolvedValue([
        { student_id: 'aluno-1', student_name: 'João Silva', room_name: 'Sala 01' },
      ]);
      checkinsRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.kioskSearchCheckedIn(TENANT, 'joão');

      expect(result).toEqual([
        { studentId: 'aluno-1', studentName: 'João Silva', roomName: 'Sala 01' },
      ]);
      expect(qb.andWhere).toHaveBeenCalledWith('c.checkout_at IS NULL');
    });
  });

  describe('checkout', () => {
    it('encerra o check-in ativo do aluno', async () => {
      checkinsRepo.update.mockResolvedValue({ affected: 1 });

      await service.checkout(TENANT, 'aluno-1');

      expect(checkinsRepo.update).toHaveBeenCalledWith(
        { tenantId: TENANT, studentId: 'aluno-1', checkoutAt: IsNull() },
        { checkoutAt: expect.any(Date) },
      );
    });
  });
});

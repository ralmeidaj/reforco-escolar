import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { Announcement } from './announcement.entity';

const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
});

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQb()),
});

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let repo: ReturnType<typeof makeRepo>;

  const tenantId = 'tenant-1';
  const createdById = 'admin-1';

  beforeEach(async () => {
    repo = makeRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        { provide: getRepositoryToken(Announcement), useValue: repo },
      ],
    }).compile();
    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  describe('create', () => {
    it('creates announcement with empty targetRoles by default', async () => {
      repo.save.mockImplementation((v) => Promise.resolve({ id: 'ann-1', ...v }));
      const result = await service.create(tenantId, createdById, { title: 'Aviso', content: 'Conteúdo' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ targetRoles: [] }));
      expect(result.title).toBe('Aviso');
    });

    it('uses provided targetRoles', async () => {
      repo.save.mockImplementation((v) => Promise.resolve(v));
      await service.create(tenantId, createdById, { title: 'T', content: 'C', targetRoles: ['student', 'guardian'] });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ targetRoles: ['student', 'guardian'] }));
    });
  });

  describe('findAll', () => {
    it('returns all announcements ordered by date', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll(tenantId);
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({ order: { createdAt: 'DESC' } }));
    });
  });

  describe('findForRole', () => {
    it('queries by tenant and role', async () => {
      await service.findForRole(tenantId, 'student');
      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes existing announcement', async () => {
      const ann = { id: 'ann-1', tenantId };
      repo.findOne.mockResolvedValue(ann);
      await service.remove(tenantId, 'ann-1');
      expect(repo.remove).toHaveBeenCalledWith(ann);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});

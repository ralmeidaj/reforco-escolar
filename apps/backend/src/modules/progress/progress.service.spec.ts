import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProgressService } from './progress.service';
import { StudentProgress } from './student-progress.entity';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
});

describe('ProgressService', () => {
  let service: ProgressService;
  let repo: ReturnType<typeof makeRepo>;

  const tenantId = 'tenant-1';
  const studentId = 'student-1';
  const subjectId = 'subject-1';

  beforeEach(async () => {
    repo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: getRepositoryToken(StudentProgress), useValue: repo },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
  });

  describe('upsert', () => {
    it('creates a new progress entry when none exists', async () => {
      repo.findOne.mockResolvedValue(null);
      const saved = { id: 'p-1', tenantId, studentId, subjectId, level: 'iniciante', notes: null };
      repo.save.mockResolvedValue(saved);

      const result = await service.upsert(tenantId, { studentId, subjectId, level: 'iniciante' });
      expect(repo.create).toHaveBeenCalled();
      expect(result.level).toBe('iniciante');
    });

    it('updates level when entry already exists', async () => {
      const existing = { id: 'p-1', tenantId, studentId, subjectId, level: 'iniciante', notes: null };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue({ ...existing, level: 'intermediario' });

      const result = await service.upsert(tenantId, { studentId, subjectId, level: 'intermediario' });
      expect(repo.create).not.toHaveBeenCalled();
      expect(result.level).toBe('intermediario');
    });

    it('sets notes when provided', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.save.mockImplementation((v) => Promise.resolve(v));

      await service.upsert(tenantId, { studentId, subjectId, level: 'basico', notes: 'Good progress' });
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Good progress' }));
    });
  });

  describe('findByStudent', () => {
    it('returns all progress entries for student', async () => {
      const list = [{ id: 'p-1', studentId }];
      repo.find.mockResolvedValue(list);

      const result = await service.findByStudent(tenantId, studentId);
      expect(repo.find).toHaveBeenCalledWith({ where: { tenantId, studentId } });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByStudentAndSubject', () => {
    it('returns specific progress entry', async () => {
      const entry = { id: 'p-1', studentId, subjectId };
      repo.findOne.mockResolvedValue(entry);

      const result = await service.findByStudentAndSubject(tenantId, studentId, subjectId);
      expect(result).toBe(entry);
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.findByStudentAndSubject(tenantId, studentId, subjectId);
      expect(result).toBeNull();
    });
  });
});

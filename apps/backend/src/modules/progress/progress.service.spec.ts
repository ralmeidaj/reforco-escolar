import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { StudentProgress } from './student-progress.entity';
import { StudentGrade } from './student-grade.entity';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
  remove: jest.fn(),
});

describe('ProgressService', () => {
  let service: ProgressService;
  let repo: ReturnType<typeof makeRepo>;
  let gradeRepo: ReturnType<typeof makeRepo>;

  const tenantId = 'tenant-1';
  const studentId = 'student-1';
  const subjectId = 'subject-1';
  const teacherId = 'teacher-1';

  beforeEach(async () => {
    repo = makeRepo();
    gradeRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: getRepositoryToken(StudentProgress), useValue: repo },
        { provide: getRepositoryToken(StudentGrade), useValue: gradeRepo },
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

  describe('createGrade', () => {
    it('cria a nota com recordedBy vindo de fora do dto', async () => {
      gradeRepo.save.mockImplementation((v: any) => Promise.resolve({ id: 'g-1', ...v }));

      const result = await service.createGrade(tenantId, teacherId, {
        studentId, subject: 'Matemática', unidade: '1ª Unidade', value: 8.5,
      });

      expect(gradeRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        tenantId, studentId, recordedBy: teacherId, subject: 'Matemática', unidade: '1ª Unidade', value: 8.5,
      }));
      expect(result.id).toBe('g-1');
    });
  });

  describe('findGradesByStudent', () => {
    it('filtra por tenant e aluno', async () => {
      const grades = [{ id: 'g-1', studentId }];
      gradeRepo.find.mockResolvedValue(grades);

      const result = await service.findGradesByStudent(tenantId, studentId);

      expect(gradeRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId, studentId } }));
      expect(result).toEqual(grades);
    });
  });

  describe('deleteGrade', () => {
    it('remove a nota quando encontrada', async () => {
      const grade = { id: 'g-1', tenantId };
      gradeRepo.findOne.mockResolvedValue(grade);

      await service.deleteGrade(tenantId, 'g-1');

      expect(gradeRepo.remove).toHaveBeenCalledWith(grade);
    });

    it('lança NotFoundException quando não encontrada', async () => {
      gradeRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteGrade(tenantId, 'ghost')).rejects.toThrow(NotFoundException);
    });
  });
});

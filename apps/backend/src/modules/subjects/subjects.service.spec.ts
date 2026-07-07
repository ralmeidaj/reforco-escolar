import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { Subject } from './subject.entity';
import { TeacherSubject } from './teacher-subject.entity';
import { StudentEnrollment } from './student-enrollment.entity';
import { GuardianStudent } from './guardian-student.entity';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('SubjectsService', () => {
  let service: SubjectsService;
  let subjectsRepo: ReturnType<typeof makeRepo>;
  let teacherSubjectsRepo: ReturnType<typeof makeRepo>;
  let enrollmentsRepo: ReturnType<typeof makeRepo>;
  let guardianStudentsRepo: ReturnType<typeof makeRepo>;

  const TENANT = 'tenant-1';

  beforeEach(async () => {
    subjectsRepo = makeRepo();
    teacherSubjectsRepo = makeRepo();
    enrollmentsRepo = makeRepo();
    guardianStudentsRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectsService,
        { provide: getRepositoryToken(Subject), useValue: subjectsRepo },
        { provide: getRepositoryToken(TeacherSubject), useValue: teacherSubjectsRepo },
        { provide: getRepositoryToken(StudentEnrollment), useValue: enrollmentsRepo },
        { provide: getRepositoryToken(GuardianStudent), useValue: guardianStudentsRepo },
      ],
    }).compile();

    service = module.get<SubjectsService>(SubjectsService);
  });

  // ── Subjects ──────────────────────────────────────────────────────────────

  describe('findAllSubjects', () => {
    it('retorna lista de disciplinas do tenant', async () => {
      const subjects = [{ id: 's1', name: 'Matemática', tenantId: TENANT }];
      subjectsRepo.find.mockResolvedValue(subjects);
      const result = await service.findAllSubjects(TENANT);
      expect(result).toEqual(subjects);
      expect(subjectsRepo.find).toHaveBeenCalledWith({ where: { tenantId: TENANT }, order: { name: 'ASC' } });
    });
  });

  describe('findSubject', () => {
    it('retorna a disciplina se encontrada', async () => {
      const subject = { id: 's1', name: 'Matemática', tenantId: TENANT };
      subjectsRepo.findOne.mockResolvedValue(subject);
      const result = await service.findSubject(TENANT, 's1');
      expect(result).toEqual(subject);
    });

    it('lança NotFoundException se disciplina não existe', async () => {
      subjectsRepo.findOne.mockResolvedValue(null);
      await expect(service.findSubject(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSubject', () => {
    it('cria e retorna a nova disciplina', async () => {
      const dto = { name: 'Português', color: '#EF4444', icon: 'book' };
      const saved = { id: 's2', ...dto, tenantId: TENANT };
      subjectsRepo.save.mockResolvedValue(saved);
      const result = await service.createSubject(TENANT, dto);
      expect(result).toEqual(saved);
      expect(subjectsRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSubject', () => {
    it('atualiza e salva a disciplina', async () => {
      const subject = { id: 's1', name: 'Matemática', tenantId: TENANT };
      subjectsRepo.findOne.mockResolvedValue(subject);
      subjectsRepo.save.mockResolvedValue({ ...subject, name: 'Matemática Avançada' });
      const result = await service.updateSubject(TENANT, 's1', { name: 'Matemática Avançada' });
      expect(result.name).toBe('Matemática Avançada');
    });

    it('lança NotFoundException se disciplina não existe', async () => {
      subjectsRepo.findOne.mockResolvedValue(null);
      await expect(service.updateSubject(TENANT, 'nao-existe', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeSubject', () => {
    it('remove a disciplina se encontrada', async () => {
      const subject = { id: 's1', name: 'Matemática', tenantId: TENANT };
      subjectsRepo.findOne.mockResolvedValue(subject);
      subjectsRepo.remove.mockResolvedValue(undefined);
      await service.removeSubject(TENANT, 's1');
      expect(subjectsRepo.remove).toHaveBeenCalledWith(subject);
    });

    it('lança NotFoundException se disciplina não existe', async () => {
      subjectsRepo.findOne.mockResolvedValue(null);
      await expect(service.removeSubject(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Teacher ↔ Subject ─────────────────────────────────────────────────────

  describe('linkTeacherSubject', () => {
    it('cria vínculo professor ↔ disciplina', async () => {
      teacherSubjectsRepo.findOne.mockResolvedValue(null);
      const saved = { id: 'ts1', tenantId: TENANT, teacherId: 'u1', subjectId: 's1' };
      teacherSubjectsRepo.save.mockResolvedValue(saved);
      const result = await service.linkTeacherSubject(TENANT, { teacherId: 'u1', subjectId: 's1' });
      expect(result).toEqual(saved);
    });

    it('lança ConflictException se vínculo já existe', async () => {
      teacherSubjectsRepo.findOne.mockResolvedValue({ id: 'ts1' });
      await expect(
        service.linkTeacherSubject(TENANT, { teacherId: 'u1', subjectId: 's1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unlinkTeacherSubject', () => {
    it('remove vínculo professor ↔ disciplina', async () => {
      const link = { id: 'ts1', tenantId: TENANT };
      teacherSubjectsRepo.findOne.mockResolvedValue(link);
      await service.unlinkTeacherSubject(TENANT, 'ts1');
      expect(teacherSubjectsRepo.remove).toHaveBeenCalledWith(link);
    });

    it('lança NotFoundException se vínculo não existe', async () => {
      teacherSubjectsRepo.findOne.mockResolvedValue(null);
      await expect(service.unlinkTeacherSubject(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Student Enrollments ───────────────────────────────────────────────────

  describe('enroll', () => {
    it('matricula aluno na disciplina', async () => {
      enrollmentsRepo.findOne.mockResolvedValue(null);
      const saved = { id: 'e1', tenantId: TENANT, studentId: 'u2', subjectId: 's1' };
      enrollmentsRepo.save.mockResolvedValue(saved);
      const result = await service.enroll(TENANT, { studentId: 'u2', subjectId: 's1' });
      expect(result).toEqual(saved);
    });

    it('lança ConflictException se aluno já matriculado', async () => {
      enrollmentsRepo.findOne.mockResolvedValue({ id: 'e1' });
      await expect(
        service.enroll(TENANT, { studentId: 'u2', subjectId: 's1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unenroll', () => {
    it('remove a matrícula', async () => {
      const enrollment = { id: 'e1', tenantId: TENANT };
      enrollmentsRepo.findOne.mockResolvedValue(enrollment);
      await service.unenroll(TENANT, 'e1');
      expect(enrollmentsRepo.remove).toHaveBeenCalledWith(enrollment);
    });

    it('lança NotFoundException se matrícula não existe', async () => {
      enrollmentsRepo.findOne.mockResolvedValue(null);
      await expect(service.unenroll(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Guardian ↔ Student ────────────────────────────────────────────────────

  describe('linkGuardianStudent', () => {
    it('cria vínculo responsável ↔ aluno', async () => {
      guardianStudentsRepo.findOne.mockResolvedValue(null);
      const saved = { id: 'gs1', tenantId: TENANT, guardianId: 'g1', studentId: 'u2' };
      guardianStudentsRepo.save.mockResolvedValue(saved);
      const result = await service.linkGuardianStudent(TENANT, { guardianId: 'g1', studentId: 'u2' });
      expect(result).toEqual(saved);
    });

    it('lança ConflictException se vínculo já existe', async () => {
      guardianStudentsRepo.findOne.mockResolvedValue({ id: 'gs1' });
      await expect(
        service.linkGuardianStudent(TENANT, { guardianId: 'g1', studentId: 'u2' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unlinkGuardianStudent', () => {
    it('remove vínculo responsável ↔ aluno', async () => {
      const link = { id: 'gs1', tenantId: TENANT };
      guardianStudentsRepo.findOne.mockResolvedValue(link);
      await service.unlinkGuardianStudent(TENANT, 'gs1');
      expect(guardianStudentsRepo.remove).toHaveBeenCalledWith(link);
    });

    it('lança NotFoundException se vínculo não existe', async () => {
      guardianStudentsRepo.findOne.mockResolvedValue(null);
      await expect(service.unlinkGuardianStudent(TENANT, 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });
});

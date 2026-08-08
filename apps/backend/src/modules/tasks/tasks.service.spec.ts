import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';
import { StudyLog } from './study-log.entity';
import { ActivitySubmission } from './activity-submission.entity';
import { SchoolTaskCapture } from './school-task-capture.entity';

const mockOpenAiCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAiCreate,
      },
    },
  })),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-image-bytes')),
}));

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
  remove: jest.fn(),
});

const mockConfig = { get: jest.fn().mockReturnValue(null) }; // sem OPENAI_API_KEY por padrão

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: ReturnType<typeof makeRepo>;
  let studyLogRepo: ReturnType<typeof makeRepo>;
  let submissionRepo: ReturnType<typeof makeRepo>;
  let captureRepo: ReturnType<typeof makeRepo>;

  const tenantId = 'tenant-1';
  const teacherId = 'teacher-1';
  const studentId = 'student-1';
  const subjectId = 'subject-1';

  beforeEach(async () => {
    taskRepo = makeRepo();
    studyLogRepo = makeRepo();
    submissionRepo = makeRepo();
    captureRepo = makeRepo();
    mockConfig.get.mockReturnValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(StudyLog), useValue: studyLogRepo },
        { provide: getRepositoryToken(ActivitySubmission), useValue: submissionRepo },
        { provide: getRepositoryToken(SchoolTaskCapture), useValue: captureRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('createTask', () => {
    it('creates a task with defaults', async () => {
      const saved = { id: 'task-1', tenantId, teacherId, studentId, subjectId, title: 'Test', type: 'padrao', done: false };
      taskRepo.save.mockResolvedValue(saved);

      const result = await service.createTask(tenantId, teacherId, {
        studentId, subjectId, title: 'Test',
      });

      expect(taskRepo.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'padrao', done: false }));
      expect(result.title).toBe('Test');
    });

    it('creates a task with custom type and dueDate', async () => {
      const saved = { id: 'task-2', type: 'eureka', dueDate: '2025-01-20' };
      taskRepo.save.mockResolvedValue(saved);

      await service.createTask(tenantId, teacherId, {
        studentId, subjectId, title: 'Quiz', type: 'eureka', dueDate: '2025-01-20',
      });

      expect(taskRepo.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'eureka', dueDate: '2025-01-20' }));
    });
  });

  describe('findTask', () => {
    it('returns task when found', async () => {
      const task = { id: 'task-1', tenantId };
      taskRepo.findOne.mockResolvedValue(task);

      const result = await service.findTask(tenantId, 'task-1');
      expect(result).toBe(task);
    });

    it('throws NotFoundException when not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.findTask(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTask', () => {
    it('updates provided fields', async () => {
      const task = { id: 'task-1', tenantId, title: 'Old', type: 'padrao', dueDate: null };
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockResolvedValue({ ...task, title: 'New', dueDate: '2025-02-01' });

      const result = await service.updateTask(tenantId, 'task-1', { title: 'New', dueDate: '2025-02-01' });
      expect(result.title).toBe('New');
      expect(result.dueDate).toBe('2025-02-01');
    });
  });

  describe('markDone', () => {
    it('marks task as done when student matches', async () => {
      const task = { id: 'task-1', tenantId, studentId, done: false, doneAt: null };
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.save.mockImplementation((v) => Promise.resolve({ ...v, done: true }));

      const result = await service.markDone(tenantId, 'task-1', studentId);
      expect(result.done).toBe(true);
    });

    it('throws ForbiddenException when student does not match', async () => {
      const task = { id: 'task-1', tenantId, studentId: 'other-student', done: false };
      taskRepo.findOne.mockResolvedValue(task);

      await expect(service.markDone(tenantId, 'task-1', studentId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTask', () => {
    it('removes task', async () => {
      const task = { id: 'task-1', tenantId };
      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.remove.mockResolvedValue(task);

      await service.deleteTask(tenantId, 'task-1');
      expect(taskRepo.remove).toHaveBeenCalledWith(task);
    });
  });

  describe('createStudyLog', () => {
    it('creates study log with defaults', async () => {
      const log = { id: 'log-1', tenantId, studentId, subjectId, topic: 'Frações', pagesRead: 5, studiedAt: '2025-01-15' };
      studyLogRepo.save.mockResolvedValue(log);

      const result = await service.createStudyLog(tenantId, studentId, {
        subjectId, topic: 'Frações', pagesRead: 5, studiedAt: '2025-01-15',
      });

      expect(studyLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({ pagesRead: 5 }));
      expect(result.topic).toBe('Frações');
    });

    it('defaults pagesRead to 0', async () => {
      studyLogRepo.save.mockImplementation((v) => Promise.resolve(v));

      await service.createStudyLog(tenantId, studentId, {
        subjectId, topic: 'Leitura', studiedAt: '2025-01-15',
      });

      expect(studyLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({ pagesRead: 0 }));
    });
  });

  describe('createActivitySubmission', () => {
    it('creates submission with file URL', async () => {
      const sub = { id: 'sub-1', tenantId, studentId, taskId: 'task-1', fileUrl: '/uploads/file.jpg' };
      submissionRepo.save.mockResolvedValue(sub);

      const result = await service.createActivitySubmission(tenantId, studentId, { taskId: 'task-1' }, '/uploads/file.jpg', 'image/jpeg');
      expect(result.fileUrl).toBe('/uploads/file.jpg');
    });
  });

  describe('extractSchoolTaskCapture', () => {
    const file = { filename: 'foto.jpg', path: '/tmp/foto.jpg', mimetype: 'image/jpeg' };

    it('retorna extracted null quando não há OPENAI_API_KEY', async () => {
      const result = await service.extractSchoolTaskCapture(tenantId, file);

      expect(result).toEqual({ imageUrl: '/uploads/foto.jpg', extracted: null });
      expect(mockOpenAiCreate).not.toHaveBeenCalled();
    });

    it('retorna imageUrl stub quando não há arquivo', async () => {
      const result = await service.extractSchoolTaskCapture(tenantId, null);
      expect(result).toEqual({ imageUrl: 'stub://no-file', extracted: null });
    });

    it('retorna dados extraídos quando há OPENAI_API_KEY e a IA responde', async () => {
      mockConfig.get.mockReturnValue('fake-key');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TasksService,
          { provide: getRepositoryToken(Task), useValue: taskRepo },
          { provide: getRepositoryToken(StudyLog), useValue: studyLogRepo },
          { provide: getRepositoryToken(ActivitySubmission), useValue: submissionRepo },
          { provide: getRepositoryToken(SchoolTaskCapture), useValue: captureRepo },
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();
      const serviceWithAi = module.get<TasksService>(TasksService);

      mockOpenAiCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ subject: 'Matemática', title: 'Página 45', description: 'Exercícios 1-10', dueDate: '2025-02-10' }) } }],
      });

      const result = await serviceWithAi.extractSchoolTaskCapture(tenantId, file);

      expect(result.imageUrl).toBe('/uploads/foto.jpg');
      expect(result.extracted).toEqual({ subject: 'Matemática', title: 'Página 45', description: 'Exercícios 1-10', dueDate: '2025-02-10' });
    });

    it('cai no fallback quando a chamada à IA falha', async () => {
      mockConfig.get.mockReturnValue('fake-key');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TasksService,
          { provide: getRepositoryToken(Task), useValue: taskRepo },
          { provide: getRepositoryToken(StudyLog), useValue: studyLogRepo },
          { provide: getRepositoryToken(ActivitySubmission), useValue: submissionRepo },
          { provide: getRepositoryToken(SchoolTaskCapture), useValue: captureRepo },
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile();
      const serviceWithAi = module.get<TasksService>(TasksService);

      mockOpenAiCreate.mockRejectedValue(new Error('API indisponível'));

      const result = await serviceWithAi.extractSchoolTaskCapture(tenantId, file);

      expect(result).toEqual({ imageUrl: '/uploads/foto.jpg', extracted: null });
    });
  });

  describe('confirmSchoolTaskCapture', () => {
    it('cria a captura com os campos do dto', async () => {
      captureRepo.save.mockImplementation((v: any) => Promise.resolve({ id: 'cap-1', ...v }));

      const result = await service.confirmSchoolTaskCapture(tenantId, studentId, {
        imageUrl: '/uploads/foto.jpg',
        subject: 'Matemática',
        title: 'Página 45',
        description: 'Exercícios 1-10',
        dueDate: '2025-02-10',
      });

      expect(captureRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        tenantId, studentId, imageUrl: '/uploads/foto.jpg', title: 'Página 45',
      }));
      expect(result.id).toBe('cap-1');
    });

    it('usa null para campos opcionais ausentes', async () => {
      captureRepo.save.mockImplementation((v: any) => Promise.resolve(v));

      await service.confirmSchoolTaskCapture(tenantId, studentId, {
        imageUrl: '/uploads/foto.jpg',
        title: 'Tarefa sem detalhes',
      });

      expect(captureRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        subject: null, description: null, dueDate: null,
      }));
    });
  });

  describe('findSchoolTaskCaptures', () => {
    it('filtra por tenant e aluno quando studentId é informado', async () => {
      const captures = [{ id: 'cap-1', studentId }];
      captureRepo.find.mockResolvedValue(captures);

      const result = await service.findSchoolTaskCaptures(tenantId, studentId);

      expect(captureRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { tenantId, studentId },
      }));
      expect(result).toEqual(captures);
    });

    it('filtra só por tenant quando studentId não é informado', async () => {
      captureRepo.find.mockResolvedValue([]);

      await service.findSchoolTaskCaptures(tenantId);

      expect(captureRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { tenantId },
      }));
    });
  });
});

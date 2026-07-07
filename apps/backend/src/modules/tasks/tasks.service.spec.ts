import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';
import { StudyLog } from './study-log.entity';
import { ActivitySubmission } from './activity-submission.entity';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
  remove: jest.fn(),
});

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: ReturnType<typeof makeRepo>;
  let studyLogRepo: ReturnType<typeof makeRepo>;
  let submissionRepo: ReturnType<typeof makeRepo>;

  const tenantId = 'tenant-1';
  const teacherId = 'teacher-1';
  const studentId = 'student-1';
  const subjectId = 'subject-1';

  beforeEach(async () => {
    taskRepo = makeRepo();
    studyLogRepo = makeRepo();
    submissionRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(StudyLog), useValue: studyLogRepo },
        { provide: getRepositoryToken(ActivitySubmission), useValue: submissionRepo },
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
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { Attendance } from './attendance.entity';
import { SessionNote } from './session-note.entity';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
  count: jest.fn(),
});

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepo: ReturnType<typeof makeRepo>;
  let noteRepo: ReturnType<typeof makeRepo>;

  const tenantId = 'tenant-1';
  const teacherId = 'teacher-1';
  const studentId = 'student-1';
  const sessionId = 'session-1';

  beforeEach(async () => {
    attendanceRepo = makeRepo();
    noteRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: getRepositoryToken(Attendance), useValue: attendanceRepo },
        { provide: getRepositoryToken(SessionNote), useValue: noteRepo },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('createOrUpdate', () => {
    it('creates a new attendance when none exists', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);
      const saved = { id: 'att-1', tenantId, sessionId, studentId, status: 'presente' };
      attendanceRepo.save.mockResolvedValue(saved);

      const result = await service.createOrUpdate(tenantId, teacherId, {
        sessionId, studentId, status: 'presente',
      });

      expect(attendanceRepo.create).toHaveBeenCalled();
      expect(attendanceRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('presente');
    });

    it('updates existing attendance when found', async () => {
      const existing = { id: 'att-1', tenantId, sessionId, studentId, status: 'presente' };
      attendanceRepo.findOne.mockResolvedValue(existing);
      attendanceRepo.save.mockResolvedValue({ ...existing, status: 'ausente' });

      const result = await service.createOrUpdate(tenantId, teacherId, {
        sessionId, studentId, status: 'ausente',
      });

      expect(attendanceRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('ausente');
    });
  });

  describe('findBySession', () => {
    it('returns attendances for session', async () => {
      const list = [{ id: 'att-1', sessionId }];
      attendanceRepo.find.mockResolvedValue(list);

      const result = await service.findBySession(tenantId, sessionId);
      expect(attendanceRepo.find).toHaveBeenCalledWith({ where: { tenantId, sessionId } });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByStudent', () => {
    it('returns attendances for student ordered by date', async () => {
      attendanceRepo.find.mockResolvedValue([]);
      await service.findByStudent(tenantId, studentId);
      expect(attendanceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId, studentId }, order: { createdAt: 'DESC' } }),
      );
    });
  });

  describe('updateStatus', () => {
    it('updates status on found attendance', async () => {
      const attendance = { id: 'att-1', tenantId, sessionId, studentId, status: 'presente' };
      attendanceRepo.findOne.mockResolvedValue(attendance);
      attendanceRepo.save.mockResolvedValue({ ...attendance, status: 'justificado' });

      const result = await service.updateStatus(tenantId, 'att-1', { status: 'justificado' });
      expect(result.status).toBe('justificado');
    });

    it('throws NotFoundException when attendance not found', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);
      await expect(service.updateStatus(tenantId, 'x', { status: 'ausente' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('addSessionNote', () => {
    it('creates note when none exists for session+teacher', async () => {
      noteRepo.findOne.mockResolvedValue(null);
      const note = { id: 'note-1', tenantId, sessionId, teacherId, content: 'Good session' };
      noteRepo.save.mockResolvedValue(note);

      const result = await service.addSessionNote(tenantId, teacherId, {
        sessionId, content: 'Good session',
      });

      expect(noteRepo.create).toHaveBeenCalled();
      expect(result.content).toBe('Good session');
    });

    it('updates note when already exists', async () => {
      const existing = { id: 'note-1', tenantId, sessionId, teacherId, content: 'Old' };
      noteRepo.findOne.mockResolvedValue(existing);
      noteRepo.save.mockResolvedValue({ ...existing, content: 'Updated' });

      const result = await service.addSessionNote(tenantId, teacherId, {
        sessionId, content: 'Updated',
      });

      expect(noteRepo.create).not.toHaveBeenCalled();
      expect(result.content).toBe('Updated');
    });
  });

  describe('getConsecutiveAbsences', () => {
    it('counts consecutive absences from most recent records', async () => {
      attendanceRepo.find.mockResolvedValue([
        { status: 'ausente' },
        { status: 'ausente' },
        { status: 'presente' },
      ]);

      const count = await service.getConsecutiveAbsences(tenantId, studentId);
      expect(count).toBe(2);
    });

    it('returns 0 when most recent is presente', async () => {
      attendanceRepo.find.mockResolvedValue([{ status: 'presente' }, { status: 'ausente' }]);
      const count = await service.getConsecutiveAbsences(tenantId, studentId);
      expect(count).toBe(0);
    });
  });
});

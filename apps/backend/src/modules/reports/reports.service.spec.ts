import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';

const makeDs = () => ({ query: jest.fn() });

describe('ReportsService', () => {
  let service: ReportsService;
  let ds: ReturnType<typeof makeDs>;

  const tenantId = 'tenant-1';
  const teacherId = 'teacher-1';
  const studentId = 'student-1';

  beforeEach(async () => {
    ds = makeDs();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getDataSourceToken(), useValue: ds },
      ],
    }).compile();
    service = module.get<ReportsService>(ReportsService);
  });

  describe('getAdminKpis', () => {
    it('returns zeroed kpis when no rows', async () => {
      ds.query.mockResolvedValue([]);
      const result = await service.getAdminKpis(tenantId);
      expect(result.activeStudents).toBe(0);
      expect(result.attendanceRate).toBe(100);
    });

    it('calculates attendanceRate from row data', async () => {
      ds.query.mockResolvedValue([{
        active_students: '5', active_teachers: '2',
        total_sessions: '20', completed_sessions: '18',
        revenue_total: '1500.00', total_absences: '4',
      }]);
      const result = await service.getAdminKpis(tenantId);
      expect(result.activeStudents).toBe(5);
      expect(result.revenueTotal).toBe(1500);
      expect(result.attendanceRate).toBe(80); // (20-4)/20 = 80%
    });
  });

  describe('getTeacherReport', () => {
    it('aggregates session and task data', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '10', completed: '8' }])
        .mockResolvedValueOnce([{ cnt: '4' }])
        .mockResolvedValueOnce([{ pending: '3' }]);
      const result = await service.getTeacherReport(tenantId, teacherId);
      expect(result.totalSessions).toBe(10);
      expect(result.completedSessions).toBe(8);
      expect(result.studentCount).toBe(4);
      expect(result.pendingTasks).toBe(3);
    });
  });

  describe('getStudentReport', () => {
    it('calculates attendanceRate correctly', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '10', present: '9' }])
        .mockResolvedValueOnce([{ pending: '2', done: '5' }])
        .mockResolvedValueOnce([{ cnt: '7' }])
        .mockResolvedValueOnce([{ subject_name: 'Matemática', level: 'intermediario' }]);
      const result = await service.getStudentReport(tenantId, studentId);
      expect(result.attendanceRate).toBe(90);
      expect(result.pendingTasks).toBe(2);
      expect(result.progressBySubject).toHaveLength(1);
      expect(result.progressBySubject[0].subjectName).toBe('Matemática');
    });

    it('returns 100% attendanceRate when no sessions', async () => {
      ds.query
        .mockResolvedValueOnce([{ total: '0', present: '0' }])
        .mockResolvedValueOnce([{ pending: '0', done: '0' }])
        .mockResolvedValueOnce([{ cnt: '0' }])
        .mockResolvedValueOnce([]);
      const result = await service.getStudentReport(tenantId, studentId);
      expect(result.attendanceRate).toBe(100);
    });
  });

  describe('getGuardianReport', () => {
    it('includes student info and balance', async () => {
      // getStudentReport inner calls (4 queries) + outer queries (student, balance, progress)
      ds.query
        .mockResolvedValueOnce([{ id: studentId, name: 'João' }])          // student row
        .mockResolvedValueOnce([{ total: '8', present: '7' }])             // attendance
        .mockResolvedValueOnce([{ pending: '1', done: '3' }])              // tasks
        .mockResolvedValueOnce([{ cnt: '4' }])                             // study logs
        .mockResolvedValueOnce([])                                          // progress inner
        .mockResolvedValueOnce([{ remaining: '5' }])                       // balance
        .mockResolvedValueOnce([]);                                         // progress outer
      const result = await service.getGuardianReport(tenantId, studentId);
      expect(result.student.name).toBe('João');
      expect(result.lessonsRemaining).toBe(5);
      expect(result.attendanceRate).toBe(88); // floor(7/8*100)
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Plan } from './plan.entity';
import { StudentPlan } from './student-plan.entity';
import { Payment } from './payment.entity';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
  remove: jest.fn(),
  query: jest.fn(),
});

describe('FinanceService', () => {
  let service: FinanceService;
  let planRepo: ReturnType<typeof makeRepo>;
  let studentPlanRepo: ReturnType<typeof makeRepo>;
  let paymentRepo: ReturnType<typeof makeRepo>;

  const tenantId = 'tenant-1';
  const studentId = 'student-1';

  beforeEach(async () => {
    planRepo = makeRepo();
    studentPlanRepo = makeRepo();
    paymentRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: getRepositoryToken(Plan), useValue: planRepo },
        { provide: getRepositoryToken(StudentPlan), useValue: studentPlanRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
      ],
    }).compile();
    service = module.get<FinanceService>(FinanceService);
  });

  describe('createPlan', () => {
    it('creates a plan with provided data', async () => {
      planRepo.save.mockImplementation((v) => Promise.resolve({ id: 'plan-1', ...v }));
      const result = await service.createPlan(tenantId, { name: '10 aulas Mat', totalLessons: 10, price: 300 });
      expect(planRepo.create).toHaveBeenCalledWith(expect.objectContaining({ totalLessons: 10, price: 300 }));
      expect(result.name).toBe('10 aulas Mat');
    });
  });

  describe('findPlan', () => {
    it('returns plan when found', async () => {
      const plan = { id: 'plan-1', tenantId };
      planRepo.findOne.mockResolvedValue(plan);
      const result = await service.findPlan(tenantId, 'plan-1');
      expect(result).toBe(plan);
    });

    it('throws NotFoundException when not found', async () => {
      planRepo.findOne.mockResolvedValue(null);
      await expect(service.findPlan(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePlan', () => {
    it('updates provided fields', async () => {
      const plan = { id: 'plan-1', tenantId, name: 'Old', price: 100, active: true };
      planRepo.findOne.mockResolvedValue(plan);
      planRepo.save.mockImplementation((v) => Promise.resolve(v));
      const result = await service.updatePlan(tenantId, 'plan-1', { name: 'New', price: 200 });
      expect(result.name).toBe('New');
      expect(result.price).toBe(200);
    });
  });

  describe('enrollStudent', () => {
    it('enrolls student using plan totalLessons', async () => {
      const plan = { id: 'plan-1', tenantId, totalLessons: 8, price: 240 };
      planRepo.findOne.mockResolvedValue(plan);
      studentPlanRepo.save.mockImplementation((v) => Promise.resolve({ id: 'sp-1', ...v }));
      const result = await service.enrollStudent(tenantId, { studentId, planId: 'plan-1' });
      expect(result.lessonsTotal).toBe(8);
      expect(result.lessonsUsed).toBe(0);
    });
  });

  describe('decrementLesson', () => {
    it('increments lessonsUsed by 1', async () => {
      const sp = { id: 'sp-1', tenantId, lessonsTotal: 10, lessonsUsed: 3 };
      studentPlanRepo.findOne.mockResolvedValue(sp);
      studentPlanRepo.save.mockImplementation((v) => Promise.resolve(v));
      const result = await service.decrementLesson(tenantId, 'sp-1');
      expect(result.lessonsUsed).toBe(4);
    });

    it('throws BadRequestException when balance exhausted', async () => {
      const sp = { id: 'sp-1', tenantId, lessonsTotal: 5, lessonsUsed: 5 };
      studentPlanRepo.findOne.mockResolvedValue(sp);
      await expect(service.decrementLesson(tenantId, 'sp-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when plan not found', async () => {
      studentPlanRepo.findOne.mockResolvedValue(null);
      await expect(service.decrementLesson(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBalance', () => {
    it('sums remaining lessons from active plans', async () => {
      studentPlanRepo.find.mockResolvedValue([
        { lessonsTotal: 10, lessonsUsed: 3 },
        { lessonsTotal: 5, lessonsUsed: 5 },
      ]);
      const result = await service.getBalance(tenantId, studentId);
      expect(result.lessonsRemaining).toBe(7);
      expect(result.lowBalance).toBe(false);
    });

    it('flags lowBalance when remaining <= 2', async () => {
      studentPlanRepo.find.mockResolvedValue([{ lessonsTotal: 5, lessonsUsed: 4 }]);
      const result = await service.getBalance(tenantId, studentId);
      expect(result.lessonsRemaining).toBe(1);
      expect(result.lowBalance).toBe(true);
    });
  });

  describe('createPayment', () => {
    it('creates payment with pendente default', async () => {
      paymentRepo.save.mockImplementation((v) => Promise.resolve({ id: 'pay-1', ...v }));
      const result = await service.createPayment(tenantId, { studentId, amount: 300 });
      expect(result.status).toBe('pendente');
    });

    it('sets paidAt when status is pago', async () => {
      paymentRepo.save.mockImplementation((v) => Promise.resolve(v));
      await service.createPayment(tenantId, { studentId, amount: 300, status: 'pago' });
      expect(paymentRepo.create).toHaveBeenCalledWith(expect.objectContaining({ paidAt: expect.any(Date) }));
    });
  });

  describe('updatePayment', () => {
    it('sets paidAt when updating to pago', async () => {
      const payment = { id: 'pay-1', tenantId, status: 'pendente', paidAt: null };
      paymentRepo.findOne.mockResolvedValue(payment);
      paymentRepo.save.mockImplementation((v) => Promise.resolve(v));
      const result = await service.updatePayment(tenantId, 'pay-1', { status: 'pago' });
      expect(result.paidAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      await expect(service.updatePayment(tenantId, 'x', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMonthlyReport', () => {
    it('aggregates paid and pending totals', async () => {
      paymentRepo.query.mockResolvedValue([
        { status: 'pago', total: '500.00' },
        { status: 'pendente', total: '200.00' },
      ]);
      const result = await service.getMonthlyReport(tenantId, 2025, 1);
      expect(result.total).toBe(700);
      expect(result.paid).toBe(500);
      expect(result.pending).toBe(200);
    });
  });
});

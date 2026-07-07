import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';
import { StudentPlan } from './student-plan.entity';
import { Payment } from './payment.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { EnrollStudentPlanDto } from './dto/enroll-student-plan.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

const LOW_BALANCE_THRESHOLD = 2;

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(StudentPlan) private readonly studentPlanRepo: Repository<StudentPlan>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
  ) {}

  // ─── Planos ───────────────────────────────────────────────────────────────

  async createPlan(tenantId: string, dto: CreatePlanDto): Promise<Plan> {
    const plan = this.planRepo.create({
      tenantId,
      name: dto.name,
      description: dto.description ?? null,
      totalLessons: dto.totalLessons,
      price: dto.price,
      subjectId: dto.subjectId ?? null,
    });
    return this.planRepo.save(plan);
  }

  async findPlans(tenantId: string): Promise<Plan[]> {
    return this.planRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findPlan(tenantId: string, id: string): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { tenantId, id } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    return plan;
  }

  async updatePlan(tenantId: string, id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findPlan(tenantId, id);
    if (dto.name !== undefined) plan.name = dto.name;
    if (dto.description !== undefined) plan.description = dto.description ?? null;
    if (dto.totalLessons !== undefined) plan.totalLessons = dto.totalLessons;
    if (dto.price !== undefined) plan.price = dto.price;
    if (dto.active !== undefined) plan.active = dto.active;
    return this.planRepo.save(plan);
  }

  async removePlan(tenantId: string, id: string): Promise<void> {
    const plan = await this.findPlan(tenantId, id);
    await this.planRepo.remove(plan);
  }

  // ─── Matrículas em plano ──────────────────────────────────────────────────

  async enrollStudent(tenantId: string, dto: EnrollStudentPlanDto): Promise<StudentPlan> {
    const plan = await this.findPlan(tenantId, dto.planId);
    const enrollment = this.studentPlanRepo.create({
      tenantId,
      studentId: dto.studentId,
      planId: dto.planId,
      lessonsTotal: plan.totalLessons,
      lessonsUsed: 0,
      enrolledAt: new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      active: true,
    });
    return this.studentPlanRepo.save(enrollment);
  }

  async findStudentPlans(tenantId: string, studentId: string): Promise<StudentPlan[]> {
    return this.studentPlanRepo.find({
      where: { tenantId, studentId },
      order: { enrolledAt: 'DESC' },
    });
  }

  async decrementLesson(tenantId: string, studentPlanId: string): Promise<StudentPlan> {
    const sp = await this.studentPlanRepo.findOne({ where: { tenantId, id: studentPlanId } });
    if (!sp) throw new NotFoundException('Matrícula não encontrada');
    if (sp.lessonsUsed >= sp.lessonsTotal) throw new BadRequestException('Saldo de aulas esgotado');
    sp.lessonsUsed += 1;
    if (sp.lessonsTotal - sp.lessonsUsed <= LOW_BALANCE_THRESHOLD) {
      (sp as any)['_lowBalance'] = true;
    }
    return this.studentPlanRepo.save(sp);
  }

  async getBalance(tenantId: string, studentId: string): Promise<{ lessonsRemaining: number; lowBalance: boolean }> {
    const plans = await this.studentPlanRepo.find({ where: { tenantId, studentId, active: true } });
    const lessonsRemaining = plans.reduce((sum, p) => sum + (p.lessonsTotal - p.lessonsUsed), 0);
    return { lessonsRemaining, lowBalance: lessonsRemaining <= LOW_BALANCE_THRESHOLD };
  }

  // ─── Pagamentos ───────────────────────────────────────────────────────────

  async createPayment(tenantId: string, dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentRepo.create({
      tenantId,
      studentId: dto.studentId,
      studentPlanId: dto.studentPlanId ?? null,
      amount: dto.amount,
      status: (dto.status ?? 'pendente') as any,
      method: dto.method ?? null,
      externalRef: dto.externalRef ?? null,
      dueDate: dto.dueDate ?? null,
      notes: dto.notes ?? null,
      paidAt: dto.status === 'pago' ? new Date() : null,
    });
    return this.paymentRepo.save(payment);
  }

  async findPayments(tenantId: string, studentId?: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { tenantId, ...(studentId ? { studentId } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  async updatePayment(tenantId: string, id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { tenantId, id } });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    if (dto.status !== undefined) payment.status = dto.status as any;
    if (dto.method !== undefined) payment.method = dto.method ?? null;
    if (dto.externalRef !== undefined) payment.externalRef = dto.externalRef ?? null;
    if (dto.notes !== undefined) payment.notes = dto.notes ?? null;
    if (dto.status === 'pago' && !payment.paidAt) payment.paidAt = new Date();
    if (dto.paidAt) payment.paidAt = new Date(dto.paidAt);
    return this.paymentRepo.save(payment);
  }

  async getMonthlyReport(tenantId: string, year: number, month: number): Promise<{ total: number; paid: number; pending: number }> {
    const rows: { status: string; total: string }[] = await this.paymentRepo.query(
      `SELECT status, SUM(amount) as total
       FROM payments
       WHERE tenant_id = $1
         AND EXTRACT(YEAR FROM created_at) = $2
         AND EXTRACT(MONTH FROM created_at) = $3
       GROUP BY status`,
      [tenantId, year, month],
    );
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.total)]));
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    return { total, paid: byStatus['pago'] ?? 0, pending: byStatus['pendente'] ?? 0 };
  }
}

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { EnrollStudentPlanDto } from './dto/enroll-student-plan.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ─── Planos ───────────────────────────────────────────────────────────────

  @Post('plans')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Criar pacote de aulas' })
  @ApiResponse({ status: 201 })
  createPlan(@Request() req: any, @Body() dto: CreatePlanDto) {
    return this.financeService.createPlan(req.tenant.id, dto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Listar pacotes do tenant' })
  @ApiResponse({ status: 200 })
  findPlans(@Request() req: any) {
    return this.financeService.findPlans(req.tenant.id);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Obter pacote por ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  findPlan(@Request() req: any, @Param('id') id: string) {
    return this.financeService.findPlan(req.tenant.id, id);
  }

  @Patch('plans/:id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Atualizar pacote' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  updatePlan(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.financeService.updatePlan(req.tenant.id, id, dto);
  }

  @Delete('plans/:id')
  @Roles('tenant_admin')
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir pacote' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204 })
  async removePlan(@Request() req: any, @Param('id') id: string) {
    await this.financeService.removePlan(req.tenant.id, id);
  }

  // ─── Matrículas ───────────────────────────────────────────────────────────

  @Post('student-plans')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Matricular aluno em pacote' })
  @ApiResponse({ status: 201 })
  enrollStudent(@Request() req: any, @Body() dto: EnrollStudentPlanDto) {
    return this.financeService.enrollStudent(req.tenant.id, dto);
  }

  @Get('student-plans/student/:studentId')
  @ApiOperation({ summary: 'Listar matrículas em pacotes de um aluno' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200 })
  findStudentPlans(@Request() req: any, @Param('studentId') studentId: string) {
    return this.financeService.findStudentPlans(req.tenant.id, studentId);
  }

  @Get('student-plans/balance/:studentId')
  @ApiOperation({ summary: 'Saldo de aulas restantes do aluno' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: '{ lessonsRemaining, lowBalance }' })
  getBalance(@Request() req: any, @Param('studentId') studentId: string) {
    return this.financeService.getBalance(req.tenant.id, studentId);
  }

  @Patch('student-plans/:id/decrement')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Decrementar uma aula do saldo do plano' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  decrementLesson(@Request() req: any, @Param('id') id: string) {
    return this.financeService.decrementLesson(req.tenant.id, id);
  }

  // ─── Pagamentos ───────────────────────────────────────────────────────────

  @Post('payments')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Registrar pagamento manual' })
  @ApiResponse({ status: 201 })
  createPayment(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.financeService.createPayment(req.tenant.id, dto);
  }

  @Get('payments')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Listar pagamentos (todos ou por aluno)' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiResponse({ status: 200 })
  findPayments(@Request() req: any, @Query('studentId') studentId?: string) {
    return this.financeService.findPayments(req.tenant.id, studentId);
  }

  @Get('payments/student/:studentId')
  @ApiOperation({ summary: 'Histórico de pagamentos de um aluno' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200 })
  studentPayments(@Request() req: any, @Param('studentId') studentId: string) {
    return this.financeService.findPayments(req.tenant.id, studentId);
  }

  @Patch('payments/:id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Atualizar status de pagamento' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  updatePayment(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.financeService.updatePayment(req.tenant.id, id, dto);
  }

  @Get('finance/report')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Relatório financeiro mensal' })
  @ApiQuery({ name: 'year', type: Number })
  @ApiQuery({ name: 'month', type: Number })
  @ApiResponse({ status: 200, description: '{ total, paid, pending }' })
  monthlyReport(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.financeService.getMonthlyReport(req.tenant.id, Number(year), Number(month));
  }
}

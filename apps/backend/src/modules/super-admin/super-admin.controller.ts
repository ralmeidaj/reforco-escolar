import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { SuperAdminAuthGuard } from './super-admin-auth.guard';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminTenantsService } from './super-admin-tenants.service';
import { SaasPlansService } from './saas-plans.service';
import { AuditLogsService } from './audit-logs.service';
import {
  SuperAdminLoginDto,
  SuperAdminVerifyTotpDto,
  SuperAdminSetupTotpDto,
} from './dto/super-admin-auth.dto';
import {
  UpdateTenantStatusDto,
  AssignSaasPlanDto,
  CreateSaasPlanDto,
  UpdateSaasPlanDto,
  CreateTenantByAdminDto,
  UpdateTenantDto,
} from './dto/manage-tenant.dto';

@Public()
@ApiTags('Super Admin')
@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private authService: SuperAdminAuthService,
    private tenantsService: SuperAdminTenantsService,
    private plansService: SaasPlansService,
    private auditService: AuditLogsService,
  ) {}

  // ── Auth ────────────────────────────────────────────────────────────────────

  @Post('auth/login')
  @ApiOperation({ summary: 'Login do super admin (etapa 1 — senha)' })
  @ApiResponse({ status: 200, description: 'Retorna accessToken ou requireTotp=true' })
  login(@Body() dto: SuperAdminLoginDto) {
    return this.authService.login(dto);
  }

  @Post('auth/totp/verify')
  @ApiOperation({ summary: 'Verificar código TOTP após login (etapa 2)' })
  @ApiResponse({ status: 200 })
  verifyTotp(@Body() dto: SuperAdminVerifyTotpDto) {
    return this.authService.verifyTotp(dto);
  }

  @Get('auth/me')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do super admin autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil do super admin' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  getMe(@Req() req: Request) {
    return this.authService.getMe((req as any).user.sub);
  }

  @Post('auth/totp/setup')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar setup do TOTP (gera secret + QR)' })
  @ApiResponse({ status: 201, description: 'Secret e QR code retornados' })
  @ApiResponse({ status: 409, description: 'TOTP já está ativado' })
  setupTotp(@Req() req: Request) {
    return this.authService.setupTotp((req as any).user.sub);
  }

  @Post('auth/totp/confirm')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirmar e ativar TOTP' })
  @ApiResponse({ status: 201, description: 'TOTP ativado com sucesso' })
  @ApiResponse({ status: 400, description: 'Código TOTP inválido' })
  confirmTotp(@Req() req: Request, @Body() dto: SuperAdminSetupTotpDto) {
    return this.authService.confirmTotp((req as any).user.sub, dto);
  }

  @Post('auth/seed')
  @ApiOperation({ summary: 'Criar primeiro super admin (remover em prod)' })
  @ApiResponse({ status: 201, description: 'Super admin criado' })
  @ApiResponse({ status: 409, description: 'Super admin já existe' })
  seed(@Body() body: { email: string; password: string; name: string }) {
    return this.authService.seed(body.email, body.password, body.name);
  }

  // ── Tenants ─────────────────────────────────────────────────────────────────

  @Post('tenants')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar novo tenant (escola) com admin inicial' })
  @ApiResponse({ status: 201, description: 'Tenant criado com sucesso' })
  async createTenant(@Body() dto: CreateTenantByAdminDto, @Req() req: Request) {
    const result = await this.tenantsService.createTenant(dto);
    await this.auditService.log({
      userId: (req as any).user.sub,
      userRole: 'super_admin',
      action: 'tenant.created',
      entity: 'tenants',
      entityId: result.id,
      payload: { slug: dto.slug },
      ip: req.ip,
    });
    return result;
  }

  @Get('tenants')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os tenants' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Lista paginada de tenants' })
  listTenants(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.tenantsService.findAll(Number(page) || 1, Number(limit) || 20);
  }

  @Get('tenants/stats')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estatísticas globais de tenants' })
  @ApiResponse({ status: 200, description: 'Contagem por status' })
  tenantStats() {
    return this.tenantsService.getStats();
  }

  @Get('tenants/:id')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar tenant por ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Dados do tenant' })
  @ApiResponse({ status: 404, description: 'Tenant não encontrado' })
  getTenant(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch('tenants/:id')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar nome e slug do tenant' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Tenant atualizado' })
  @ApiResponse({ status: 404, description: 'Tenant não encontrado' })
  @ApiResponse({ status: 409, description: 'Slug já está em uso' })
  async updateTenant(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @Req() req: Request,
  ) {
    const result = await this.tenantsService.updateTenant(id, dto);
    await this.auditService.log({
      userId: (req as any).user.sub,
      userRole: 'super_admin',
      action: 'tenant.updated',
      entity: 'tenants',
      entityId: id,
      payload: dto as Record<string, unknown>,
      ip: req.ip,
    });
    return result;
  }

  @Patch('tenants/:id/status')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativar / suspender / excluir tenant' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Status atualizado' })
  @ApiResponse({ status: 404, description: 'Tenant não encontrado' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @Req() req: Request,
  ) {
    const result = await this.tenantsService.updateStatus(id, dto);
    await this.auditService.log({
      userId: (req as any).user.sub,
      userRole: 'super_admin',
      action: `tenant.status.${dto.status}`,
      entity: 'tenants',
      entityId: id,
      ip: req.ip,
    });
    return result;
  }

  @Patch('tenants/:id/plan')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atribuir plano SaaS ao tenant' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Plano atribuído com sucesso' })
  @ApiResponse({ status: 404, description: 'Tenant ou plano não encontrado' })
  async assignPlan(
    @Param('id') id: string,
    @Body() dto: AssignSaasPlanDto,
    @Req() req: Request,
  ) {
    const result = await this.tenantsService.assignPlan(id, dto);
    await this.auditService.log({
      userId: (req as any).user.sub,
      userRole: 'super_admin',
      action: 'tenant.plan.assigned',
      entity: 'tenants',
      entityId: id,
      payload: { planId: dto.planId },
      ip: req.ip,
    });
    return result;
  }

  @Post('tenants/:id/impersonate')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Impersonar tenant_admin de um tenant (token 1h)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 201, description: 'Token de impersonation gerado' })
  @ApiResponse({ status: 400, description: 'Tenant não está ativo' })
  async impersonate(@Param('id') id: string, @Req() req: Request) {
    const adminId = (req as any).user.sub;
    const result = await this.tenantsService.impersonate(id, adminId);
    await this.auditService.log({
      tenantId: id,
      userId: adminId,
      userRole: 'super_admin',
      action: 'tenant.impersonation',
      entity: 'tenants',
      entityId: id,
      ip: req.ip,
    });
    return result;
  }

  // ── SaaS Plans ──────────────────────────────────────────────────────────────

  @Get('plans')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar planos SaaS' })
  @ApiResponse({ status: 200, description: 'Lista de planos' })
  listPlans() {
    return this.plansService.findAll();
  }

  @Post('plans')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar plano SaaS' })
  @ApiResponse({ status: 201, description: 'Plano criado' })
  createPlan(@Body() dto: CreateSaasPlanDto) {
    return this.plansService.create(dto);
  }

  @Patch('plans/:id')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar plano SaaS' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Plano atualizado' })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdateSaasPlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete('plans/:id')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desativar plano SaaS' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Plano desativado' })
  removePlan(@Param('id') id: string) {
    return this.plansService.remove(id);
  }

  // ── Audit Logs ──────────────────────────────────────────────────────────────

  @Get('audit-logs')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logs de auditoria globais' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Lista de logs de auditoria' })
  getAuditLogs(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.auditService.findAll(Number(limit) || 50, Number(offset) || 0);
  }

  @Get('audit-logs/tenant/:tenantId')
  @UseGuards(SuperAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logs de auditoria de um tenant específico' })
  @ApiParam({ name: 'tenantId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lista de logs do tenant' })
  getAuditLogsByTenant(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.findByTenant(tenantId, Number(limit) || 50, Number(offset) || 0);
  }
}

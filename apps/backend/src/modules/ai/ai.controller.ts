import {
  Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards,
  UseInterceptors, UploadedFile, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiService } from './ai.service';
import { GenerateActivityDto, ReviewSuggestionDto } from './dto/ai.dto';
import { CreateActivityCorrectionDto } from './dto/create-activity-correction.dto';

@ApiTags('IA Pedagógica')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ── Panorama ─────────────────────────────────────────────────────────────

  @Get('panorama/me')
  @Roles('student')
  @ApiOperation({ summary: 'Panorama do aluno autenticado' })
  @ApiResponse({ status: 200 })
  getMyPanorama(@Req() req: Request) {
    const { sub, tenantId } = (req as any).user;
    return this.aiService.getPanorama(tenantId, sub);
  }

  @Get('panorama/:studentId')
  @Roles('teacher', 'tenant_admin', 'guardian')
  @ApiOperation({ summary: 'Panorama de um aluno específico' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Panorama do aluno' })
  @ApiResponse({ status: 404, description: 'Panorama não encontrado' })
  getPanorama(@Req() req: Request, @Param('studentId') studentId: string) {
    return this.aiService.getPanorama((req as any).user.tenantId, studentId);
  }

  @Post('panorama/:studentId/generate')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Gerar / atualizar panorama de um aluno' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 201, description: 'Panorama gerado com sucesso' })
  generatePanorama(@Req() req: Request, @Param('studentId') studentId: string) {
    return this.aiService.generatePanorama((req as any).user.tenantId, studentId);
  }

  // ── Agrupamento ───────────────────────────────────────────────────────────

  @Get('groups/by-topic')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Alunos agrupados por tópico de estudo comum' })
  @ApiResponse({ status: 200, description: 'Lista de grupos por tópico' })
  getGroupsByTopic(@Req() req: Request) {
    return this.aiService.groupByTopic((req as any).user.tenantId);
  }

  // ── Atividades e quizzes ──────────────────────────────────────────────────

  @Post('activities/generate/:studentId')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Gerar atividade/quiz para um aluno' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 201, description: 'Atividade gerada e aguardando revisão' })
  generateActivity(
    @Req() req: Request,
    @Param('studentId') studentId: string,
    @Body() dto: GenerateActivityDto,
  ) {
    return this.aiService.generateActivity(
      (req as any).user.tenantId,
      studentId,
      dto.subjectId,
      dto.type,
    );
  }

  @Get('activities/review')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Listar atividades aguardando revisão do professor' })
  @ApiResponse({ status: 200, description: 'Lista de sugestões pendentes de revisão' })
  listForReview(@Req() req: Request) {
    return this.aiService.listSuggestionsForReview((req as any).user.tenantId);
  }

  @Patch('activities/:id/review')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Aprovar ou rejeitar atividade gerada' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Atividade revisada' })
  @ApiResponse({ status: 404, description: 'Atividade não encontrada' })
  reviewSuggestion(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ReviewSuggestionDto,
  ) {
    const { sub, tenantId } = (req as any).user;
    return this.aiService.reviewSuggestion(tenantId, id, dto.status, sub);
  }

  @Get('activities/me')
  @Roles('student')
  @ApiOperation({ summary: 'Atividades aprovadas para o aluno autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de atividades do aluno' })
  getMyActivities(@Req() req: Request) {
    const { sub, tenantId } = (req as any).user;
    return this.aiService.listApprovedForStudent(tenantId, sub);
  }

  // ── Corretor de atividades por foto ─────────────────────────────────────────

  @Post('activity-corrections')
  @Roles('teacher', 'tenant_admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Corrigir foto de atividade via IA (sem gabarito) e salvar no histórico' })
  @ApiResponse({ status: 201, description: 'Correção gerada e salva' })
  @ApiResponse({ status: 400, description: 'Sem OPENAI_API_KEY configurada ou falha ao corrigir' })
  correctActivity(
    @Req() req: Request,
    @UploadedFile() file: any,
    @Body() dto: CreateActivityCorrectionDto,
  ) {
    const { sub, tenantId } = (req as any).user;
    return this.aiService.correctActivity(tenantId, sub, file, dto);
  }

  @Get('activity-corrections/student/:studentId')
  @ApiOperation({ summary: 'Histórico de correções de atividade de um aluno' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lista de correções do aluno' })
  findActivityCorrections(@Req() req: Request, @Param('studentId') studentId: string) {
    return this.aiService.findActivityCorrections((req as any).user.tenantId, studentId);
  }

  @Delete('activity-corrections/:id')
  @Roles('teacher', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover uma correção do histórico' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204, description: 'Correção removida' })
  @ApiResponse({ status: 404, description: 'Correção não encontrada' })
  async deleteActivityCorrection(@Req() req: Request, @Param('id') id: string) {
    await this.aiService.deleteActivityCorrection((req as any).user.tenantId, id);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateTeacherSubjectDto } from './dto/create-teacher-subject.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateGuardianStudentDto } from './dto/create-guardian-student.dto';

@ApiTags('Subjects')
@ApiBearerAuth()
@Controller()
export class SubjectsController {
  constructor(private readonly service: SubjectsService) {}

  // ── Disciplinas ──────────────────────────────────────────────────────────

  @Get('subjects')
  @ApiOperation({ summary: 'Listar todas as disciplinas do tenant' })
  @ApiResponse({ status: 200 })
  findAll(@Req() req: any) {
    return this.service.findAllSubjects(req.tenant.id);
  }

  @Get('subjects/:id')
  @ApiOperation({ summary: 'Buscar disciplina por ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findSubject(req.tenant.id, id);
  }

  @Post('subjects')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Criar disciplina' })
  @ApiResponse({ status: 201 })
  create(@Req() req: any, @Body() dto: CreateSubjectDto) {
    return this.service.createSubject(req.tenant.id, dto);
  }

  @Patch('subjects/:id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Atualizar disciplina' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.service.updateSubject(req.tenant.id, id, dto);
  }

  @Delete('subjects/:id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover disciplina' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204 })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.removeSubject(req.tenant.id, id);
  }

  // ── Vínculo professor ↔ disciplina ───────────────────────────────────────

  @Post('teacher-subjects')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Vincular professor a disciplina' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Vínculo já existe' })
  linkTeacher(@Req() req: any, @Body() dto: CreateTeacherSubjectDto) {
    return this.service.linkTeacherSubject(req.tenant.id, dto);
  }

  @Delete('teacher-subjects/:id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover vínculo professor ↔ disciplina' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204 })
  unlinkTeacher(@Req() req: any, @Param('id') id: string) {
    return this.service.unlinkTeacherSubject(req.tenant.id, id);
  }

  @Get('teacher-subjects')
  @ApiOperation({ summary: 'Listar disciplinas de um professor' })
  @ApiQuery({ name: 'teacherId', type: 'string' })
  @ApiResponse({ status: 200 })
  findTeacherSubjects(@Req() req: any, @Query('teacherId') teacherId: string) {
    return this.service.findTeacherSubjects(req.tenant.id, teacherId);
  }

  // ── Matrícula aluno ↔ disciplina ─────────────────────────────────────────

  @Post('enrollments')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Matricular aluno em disciplina' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Já matriculado' })
  enroll(@Req() req: any, @Body() dto: CreateEnrollmentDto) {
    return this.service.enroll(req.tenant.id, dto);
  }

  @Delete('enrollments/:id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar matrícula' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204 })
  unenroll(@Req() req: any, @Param('id') id: string) {
    return this.service.unenroll(req.tenant.id, id);
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'Listar matrículas de um aluno' })
  @ApiQuery({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200 })
  findEnrollments(@Req() req: any, @Query('studentId') studentId: string) {
    return this.service.findStudentEnrollments(req.tenant.id, studentId);
  }

  // ── Vínculo responsável ↔ aluno ──────────────────────────────────────────

  @Post('guardian-students')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Vincular responsável a aluno' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Vínculo já existe' })
  linkGuardian(@Req() req: any, @Body() dto: CreateGuardianStudentDto) {
    return this.service.linkGuardianStudent(req.tenant.id, dto);
  }

  @Delete('guardian-students/:id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover vínculo responsável ↔ aluno' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204 })
  unlinkGuardian(@Req() req: any, @Param('id') id: string) {
    return this.service.unlinkGuardianStudent(req.tenant.id, id);
  }

  @Get('guardian-students')
  @ApiOperation({ summary: 'Listar alunos de um responsável' })
  @ApiQuery({ name: 'guardianId', type: 'string' })
  @ApiResponse({ status: 200 })
  findGuardianStudents(@Req() req: any, @Query('guardianId') guardianId: string) {
    return this.service.findGuardianStudents(req.tenant.id, guardianId);
  }
}

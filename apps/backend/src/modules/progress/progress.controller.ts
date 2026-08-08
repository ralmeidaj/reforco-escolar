import { Controller, Get, Post, Delete, Body, Param, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CreateStudentGradeDto } from './dto/create-student-grade.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Progress')
@ApiBearerAuth()
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post()
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Upsert student progress for a subject' })
  @ApiResponse({ status: 201, description: 'Progress saved' })
  upsert(@Request() req: any, @Body() dto: UpdateProgressDto) {
    return this.progressService.upsert(req.tenant.id, dto);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get all progress entries for a student' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of progress entries' })
  findByStudent(@Request() req: any, @Param('studentId') studentId: string) {
    return this.progressService.findByStudent(req.tenant.id, studentId);
  }

  @Get('student/:studentId/subject/:subjectId')
  @ApiOperation({ summary: 'Get progress for a specific student/subject pair' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiParam({ name: 'subjectId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Progress entry or null' })
  findOne(@Request() req: any, @Param('studentId') studentId: string, @Param('subjectId') subjectId: string) {
    return this.progressService.findByStudentAndSubject(req.tenant.id, studentId, subjectId);
  }

  @Post('grades')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Registrar nota da escola regular do aluno' })
  @ApiResponse({ status: 201, description: 'Nota registrada' })
  createGrade(@Request() req: any, @Body() dto: CreateStudentGradeDto) {
    return this.progressService.createGrade(req.tenant.id, req.user.sub, dto);
  }

  @Get('grades/student/:studentId')
  @ApiOperation({ summary: 'Listar notas da escola regular de um aluno' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200 })
  findGrades(@Request() req: any, @Param('studentId') studentId: string) {
    return this.progressService.findGradesByStudent(req.tenant.id, studentId);
  }

  @Delete('grades/:id')
  @Roles('teacher', 'tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover nota da escola regular (correção)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204 })
  async deleteGrade(@Request() req: any, @Param('id') id: string) {
    await this.progressService.deleteGrade(req.tenant.id, id);
  }
}

import { Controller, Get, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('admin/kpis')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'KPIs gerais do tenant (usa materialized view)' })
  @ApiResponse({ status: 200, description: 'AdminKpis' })
  adminKpis(@Request() req: any) {
    return this.reportsService.getAdminKpis(req.tenant.id);
  }

  @Get('teacher/me')
  @Roles('teacher')
  @ApiOperation({ summary: 'Relatório do professor autenticado' })
  @ApiResponse({ status: 200, description: 'TeacherReport' })
  teacherReport(@Request() req: any) {
    return this.reportsService.getTeacherReport(req.tenant.id, req.user.sub);
  }

  @Get('student/me')
  @Roles('student')
  @ApiOperation({ summary: 'Relatório do aluno autenticado' })
  @ApiResponse({ status: 200, description: 'StudentReport' })
  studentReport(@Request() req: any) {
    return this.reportsService.getStudentReport(req.tenant.id, req.user.sub);
  }

  @Get('student/:studentId')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Relatório de um aluno específico' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'StudentReport' })
  studentReportById(@Request() req: any, @Param('studentId') studentId: string) {
    return this.reportsService.getStudentReport(req.tenant.id, studentId);
  }

  @Get('guardian/student/:studentId')
  @Roles('guardian', 'tenant_admin')
  @ApiOperation({ summary: 'Relatório completo de um aluno para responsável' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'GuardianReport' })
  guardianReport(@Request() req: any, @Param('studentId') studentId: string) {
    return this.reportsService.getGuardianReport(req.tenant.id, studentId);
  }
}

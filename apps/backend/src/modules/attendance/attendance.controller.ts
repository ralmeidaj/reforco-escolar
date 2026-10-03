import { Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CreateSessionNoteDto } from './dto/create-session-note.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('attendances')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Record or update attendance for a student in a session' })
  @ApiResponse({ status: 201, description: 'Attendance recorded' })
  createOrUpdate(@Request() req: any, @Body() dto: CreateAttendanceDto) {
    return this.attendanceService.createOrUpdate(req.tenant.id, req.user.sub, dto);
  }

  @Get('attendances/session/:sessionId')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'List attendances by session' })
  @ApiParam({ name: 'sessionId', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of attendances' })
  findBySession(@Request() req: any, @Param('sessionId') sessionId: string) {
    return this.attendanceService.findBySession(req.tenant.id, sessionId);
  }

  @Get('attendances/student/:studentId')
  @Roles('teacher', 'tenant_admin', 'guardian')
  @ApiOperation({ summary: 'List attendances by student' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of attendances' })
  findByStudent(@Request() req: any, @Param('studentId') studentId: string) {
    return this.attendanceService.findByStudent(req.tenant.id, studentId);
  }

  @Patch('attendances/:id')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Update attendance status' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Attendance updated' })
  updateStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
    return this.attendanceService.updateStatus(req.tenant.id, id, dto);
  }

  @Get('attendances/report')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Relatório de presença por período e sala' })
  @ApiQuery({ name: 'from', required: true, description: 'ISO 8601 start' })
  @ApiQuery({ name: 'to', required: true, description: 'ISO 8601 end' })
  @ApiQuery({ name: 'roomId', required: false })
  @ApiResponse({ status: 200, description: 'Lista de presenças no período, com sessão/sala/disciplina/professor' })
  getReport(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.attendanceService.getAttendanceReport(req.tenant.id, from, to, roomId);
  }

  @Post('session-notes')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Add or update a session note by the teacher' })
  @ApiResponse({ status: 201, description: 'Note saved' })
  addNote(@Request() req: any, @Body() dto: CreateSessionNoteDto) {
    return this.attendanceService.addSessionNote(req.tenant.id, req.user.sub, dto);
  }

  @Get('session-notes/student/:studentId')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Agenda do aluno — histórico de notas de aula por data, de todos os professores' })
  @ApiParam({ name: 'studentId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lista de notas ordenada por data da sessão (mais recente primeiro)' })
  findNotesByStudent(@Request() req: any, @Param('studentId') studentId: string) {
    return this.attendanceService.findNotesByStudent(req.tenant.id, studentId);
  }

  @Get('session-notes/:sessionId')
  @ApiOperation({ summary: 'List notes for a session' })
  @ApiParam({ name: 'sessionId', type: 'string' })
  @ApiResponse({ status: 200, description: 'List of notes' })
  findNotes(@Request() req: any, @Param('sessionId') sessionId: string) {
    return this.attendanceService.findNotesBySession(req.tenant.id, sessionId);
  }
}

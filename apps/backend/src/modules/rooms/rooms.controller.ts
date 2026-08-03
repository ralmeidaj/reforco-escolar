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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CreateRoomAssignmentDto } from './dto/create-room-assignment.dto';
import { ReassignStudentDto } from './dto/reassign-student.dto';
import { UpsertRoomScheduleDto } from './dto/upsert-room-schedule.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Rooms')
@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @Roles('tenant_admin', 'teacher')
  @ApiOperation({ summary: 'Listar salas do tenant' })
  @ApiResponse({ status: 200 })
  findAll(@Req() req: any) {
    return this.roomsService.findAll(req.tenant.id);
  }

  @Get('occupancy')
  @Roles('tenant_admin', 'teacher')
  @ApiOperation({ summary: 'Ocupação atual das salas (janela ±1h via sessões)' })
  @ApiResponse({ status: 200 })
  getOccupancy(@Req() req: any) {
    return this.roomsService.getOccupancy(req.tenant.id);
  }

  // ── Rotas de check-in de aluno (rotas estáticas antes de :id) ───────────────

  @Get('checkins/active')
  @Roles('teacher', 'tenant_admin')
  @ApiOperation({ summary: 'Alunos atualmente presentes nas salas (check-in ativo)' })
  @ApiResponse({ status: 200 })
  getActiveCheckins(@Req() req: any) {
    return this.roomsService.getActiveCheckins(req.tenant.id);
  }

  @Get('available')
  @Roles('student')
  @ApiOperation({ summary: 'Salas disponíveis com vagas para o aluno (hoje)' })
  @ApiResponse({ status: 200 })
  getAvailable(@Req() req: any) {
    return this.roomsService.getAvailableRooms(req.tenant.id);
  }

  @Get('my-checkin')
  @Roles('student')
  @ApiOperation({ summary: 'Check-in ativo do aluno (null se não estiver em nenhuma sala)' })
  @ApiResponse({ status: 200 })
  getMyCheckin(@Req() req: any) {
    return this.roomsService.getMyCheckin(req.tenant.id, req.user.sub);
  }

  @Delete('my-checkin')
  @Roles('student')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Aluno sai da sala atual (checkout)' })
  @ApiResponse({ status: 204 })
  checkout(@Req() req: any) {
    return this.roomsService.checkout(req.tenant.id, req.user.sub);
  }

  // ── Rotas genéricas ──────────────────────────────────────────────────────────

  @Get(':id')
  @Roles('tenant_admin', 'teacher')
  @ApiOperation({ summary: 'Detalhe de uma sala' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.roomsService.findOne(req.tenant.id, id);
  }

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Criar sala' })
  @ApiResponse({ status: 201 })
  create(@Req() req: any, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(req.tenant.id, dto);
  }

  @Post(':id/checkin')
  @Roles('student')
  @ApiOperation({ summary: 'Aluno entra em uma sala (check-in)' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID da sala' })
  @ApiResponse({ status: 201, description: 'Check-in registrado' })
  @ApiResponse({ status: 400, description: 'Sala sem vagas' })
  @ApiResponse({ status: 404, description: 'Sala não encontrada' })
  checkin(@Req() req: any, @Param('id') id: string) {
    return this.roomsService.checkin(req.tenant.id, req.user.sub, id);
  }

  @Patch(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Atualizar sala' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(req.tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Remover sala' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.roomsService.remove(req.tenant.id, id);
  }

  // ── Assignments ──────────────────────────────────────────────────────────────

  @Post(':id/assignments')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Adicionar professor/disciplina à sala' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 201 })
  addAssignment(@Req() req: any, @Param('id') id: string, @Body() dto: CreateRoomAssignmentDto) {
    return this.roomsService.addAssignment(req.tenant.id, id, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover professor/disciplina da sala' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'assignmentId', type: 'string' })
  @ApiResponse({ status: 204 })
  removeAssignment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.roomsService.removeAssignment(req.tenant.id, id, assignmentId);
  }

  // ── Schedules (grade de horários) ────────────────────────────────────────────

  @Get(':id/schedules')
  @Roles('tenant_admin', 'teacher')
  @ApiOperation({ summary: 'Grade de horários da sala' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  getSchedules(@Req() req: any, @Param('id') id: string) {
    return this.roomsService.getSchedules(req.tenant.id, id);
  }

  @Post(':id/schedules')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Criar/atualizar slot da grade (dia + turno)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 201 })
  upsertSchedule(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertRoomScheduleDto) {
    return this.roomsService.upsertSchedule(req.tenant.id, id, dto);
  }

  @Delete(':id/schedules/:scheduleId')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover slot da grade' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'scheduleId', type: 'string' })
  @ApiResponse({ status: 204 })
  deleteSchedule(
    @Req() req: any,
    @Param('id') _id: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.roomsService.deleteSchedule(req.tenant.id, scheduleId);
  }

  // ── Reassign ─────────────────────────────────────────────────────────────────

  @Patch('checkins/:checkinId/reassign')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Trocar professor de um aluno em check-in (admin)' })
  @ApiParam({ name: 'checkinId', type: 'string' })
  @ApiResponse({ status: 200 })
  reassignStudent(
    @Req() req: any,
    @Param('checkinId') checkinId: string,
    @Body() dto: ReassignStudentDto,
  ) {
    return this.roomsService.reassignStudent(req.tenant.id, checkinId, dto.assignmentId);
  }
}

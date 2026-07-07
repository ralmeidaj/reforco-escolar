import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { CreateAvailabilitySlotDto } from './dto/create-availability-slot.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Scheduling')
@ApiBearerAuth()
@Controller()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ── Availability Slots ────────────────────────────────────────────────────

  @Post('availability-slots')
  @Roles('tenant_admin', 'teacher')
  @ApiOperation({ summary: 'Cadastrar horário disponível do professor' })
  @ApiResponse({ status: 201 })
  createSlot(@Req() req: any, @Body() dto: CreateAvailabilitySlotDto) {
    return this.schedulingService.createSlot(req.tenant.id, dto);
  }

  @Get('availability-slots')
  @Roles('tenant_admin', 'teacher', 'guardian')
  @ApiOperation({ summary: 'Listar horários disponíveis' })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiResponse({ status: 200 })
  findSlots(@Req() req: any, @Query('teacherId') teacherId?: string) {
    return this.schedulingService.findSlots(req.tenant.id, teacherId);
  }

  @Delete('availability-slots/:id')
  @Roles('tenant_admin', 'teacher')
  @ApiOperation({ summary: 'Remover horário disponível' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  removeSlot(@Req() req: any, @Param('id') id: string) {
    return this.schedulingService.removeSlot(req.tenant.id, id);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  @Post('sessions')
  @Roles('tenant_admin', 'guardian')
  @ApiOperation({ summary: 'Agendar sessão' })
  @ApiResponse({ status: 201 })
  createSession(@Req() req: any, @Body() dto: CreateSessionDto) {
    return this.schedulingService.createSession(req.tenant.id, dto);
  }

  @Get('sessions')
  @Roles('tenant_admin', 'teacher', 'student', 'guardian')
  @ApiOperation({ summary: 'Listar sessões com filtros opcionais' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO 8601 start' })
  @ApiQuery({ name: 'to',   required: false, description: 'ISO 8601 end' })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiResponse({ status: 200 })
  findSessions(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('teacherId') teacherId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.schedulingService.findSessions(req.tenant.id, from, to, teacherId, studentId);
  }

  @Get('sessions/:id')
  @Roles('tenant_admin', 'teacher', 'student', 'guardian')
  @ApiOperation({ summary: 'Detalhe de uma sessão' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  findSession(@Req() req: any, @Param('id') id: string) {
    return this.schedulingService.findSession(req.tenant.id, id);
  }

  @Patch('sessions/:id/status')
  @Roles('tenant_admin', 'teacher')
  @ApiOperation({ summary: 'Atualizar status da sessão' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSessionStatusDto,
  ) {
    return this.schedulingService.updateStatus(req.tenant.id, id, dto);
  }

  @Delete('sessions/:id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover sessão' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204 })
  removeSession(@Req() req: any, @Param('id') id: string) {
    return this.schedulingService.removeSession(req.tenant.id, id);
  }
}

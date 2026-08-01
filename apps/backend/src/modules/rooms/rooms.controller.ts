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
}

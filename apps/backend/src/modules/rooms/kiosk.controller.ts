import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { RoomsService } from './rooms.service';

class KioskCheckinDto {
  @IsUUID() studentId: string;
  @IsUUID() roomId: string;
}

@ApiTags('Kiosk')
@Public()
@Controller('kiosk')
export class KioskController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('rooms')
  @ApiOperation({ summary: 'Salas disponíveis com vagas (público — kiosk)' })
  @ApiResponse({ status: 200 })
  getRooms(@Req() req: any) {
    return this.roomsService.getAvailableRooms(req.tenant.id);
  }

  @Get('students')
  @ApiOperation({ summary: 'Busca alunos por nome (público — kiosk)' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200 })
  searchStudents(@Req() req: any, @Query('q') q: string) {
    return this.roomsService.kioskSearchStudents(req.tenant.id, q ?? '');
  }

  @Post('checkin')
  @ApiOperation({ summary: 'Registra chegada do aluno em uma sala (público — kiosk)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Sala sem vagas' })
  checkin(@Req() req: any, @Body() dto: KioskCheckinDto) {
    return this.roomsService.checkin(req.tenant.id, dto.studentId, dto.roomId);
  }
}

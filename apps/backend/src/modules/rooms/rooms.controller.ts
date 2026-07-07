import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
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
  @ApiOperation({ summary: 'Ocupação atual das salas (janela ±1h)' })
  @ApiResponse({ status: 200 })
  getOccupancy(@Req() req: any) {
    return this.roomsService.getOccupancy(req.tenant.id);
  }

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

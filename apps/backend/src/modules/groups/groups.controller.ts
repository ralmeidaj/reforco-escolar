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
import { Roles } from '../../common/decorators/roles.decorator';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar turmas do tenant' })
  @ApiResponse({ status: 200 })
  findAll(@Req() req: any) {
    return this.service.findAll(req.tenant.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar turma por ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.tenant.id, id);
  }

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Criar turma' })
  @ApiResponse({ status: 201 })
  create(@Req() req: any, @Body() dto: CreateGroupDto) {
    return this.service.create(req.tenant.id, dto);
  }

  @Patch(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Atualizar turma' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.service.update(req.tenant.id, id, dto);
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover turma' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204 })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.tenant.id, id);
  }
}

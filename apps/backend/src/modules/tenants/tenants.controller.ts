import { Controller, Post, Get, Put, Delete, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { SetOpenAiKeyDto } from './dto/set-openai-key.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Cadastro self-service de nova escola (tenant)' })
  @ApiResponse({ status: 201, description: 'Tenant criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Slug já está em uso' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna dados do tenant atual' })
  @ApiResponse({ status: 200, description: 'Dados do tenant' })
  async me(@Req() req: any) {
    const tenant = await this.tenantsService.findById(req.tenant.id);
    return { id: tenant?.id, slug: tenant?.slug, name: tenant?.name };
  }

  @Get('me/openai-key')
  @Roles('tenant_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Status da chave OpenAI própria do tenant (nunca retorna a chave em texto claro)' })
  @ApiResponse({ status: 200, description: 'hasKey indica se há chave própria configurada; keyPreview mostra só os últimos 4 caracteres' })
  getOpenAiKey(@Req() req: any) {
    return this.tenantsService.getOpenAiKeyStatus(req.tenant.id);
  }

  @Put('me/openai-key')
  @Roles('tenant_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configura ou substitui a chave OpenAI própria do tenant' })
  @ApiResponse({ status: 200, description: 'Chave salva criptografada' })
  setOpenAiKey(@Req() req: any, @Body() dto: SetOpenAiKeyDto) {
    return this.tenantsService.setOpenAiKey(req.tenant.id, dto.apiKey);
  }

  @Delete('me/openai-key')
  @Roles('tenant_admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a chave OpenAI própria do tenant (volta a usar a chave da plataforma)' })
  @ApiResponse({ status: 204, description: 'Chave removida' })
  async removeOpenAiKey(@Req() req: any) {
    await this.tenantsService.removeOpenAiKey(req.tenant.id);
  }
}

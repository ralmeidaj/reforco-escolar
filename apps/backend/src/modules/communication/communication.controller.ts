import { Controller, Get, Post, Delete, Body, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { NotificationsService } from './notifications.service';
import { AnnouncementsService } from './announcements.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Communication')
@ApiBearerAuth()
@Controller()
export class CommunicationController {
  constructor(
    private readonly messages: MessagesService,
    private readonly notifications: NotificationsService,
    private readonly announcements: AnnouncementsService,
  ) {}

  // ─── Mensagens ───────────────────────────────────────────────────────────────

  @Post('messages')
  @ApiOperation({ summary: 'Enviar mensagem para outro usuário' })
  @ApiResponse({ status: 201, description: 'Mensagem enviada' })
  send(@Request() req: any, @Body() dto: SendMessageDto) {
    return this.messages.send(req.tenant.id, req.user.sub, dto);
  }

  @Get('messages/conversation/:otherId')
  @ApiOperation({ summary: 'Buscar conversa com outro usuário' })
  @ApiParam({ name: 'otherId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Lista de mensagens' })
  getConversation(@Request() req: any, @Param('otherId') otherId: string) {
    return this.messages.getConversation(req.tenant.id, req.user.sub, otherId);
  }

  @Post('messages/read/:otherId')
  @ApiOperation({ summary: 'Marcar mensagens de um usuário como lidas' })
  @ApiParam({ name: 'otherId', type: 'string' })
  @ApiResponse({ status: 200 })
  async markRead(@Request() req: any, @Param('otherId') otherId: string) {
    await this.messages.markRead(req.tenant.id, req.user.sub, otherId);
  }

  @Get('messages/contacts')
  @ApiOperation({ summary: 'Listar contatos com quem o usuário trocou mensagens' })
  @ApiResponse({ status: 200, description: 'Lista de contatos com contagem de não lidas' })
  getContacts(@Request() req: any) {
    return this.messages.getContacts(req.tenant.id, req.user.sub);
  }

  // ─── Notificações ─────────────────────────────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'Listar notificações do usuário autenticado' })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de notificações' })
  findNotifications(@Request() req: any, @Query('unread') unread?: string) {
    return this.notifications.findForUser(req.tenant.id, req.user.sub, unread === 'true');
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Contagem de notificações não lidas' })
  @ApiResponse({ status: 200, description: '{ count: number }' })
  async countUnread(@Request() req: any) {
    const count = await this.notifications.countUnread(req.tenant.id, req.user.sub);
    return { count };
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200 })
  async markNotificationRead(@Request() req: any, @Param('id') id: string) {
    await this.notifications.markRead(req.tenant.id, req.user.sub, id);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({ status: 200 })
  async markAllRead(@Request() req: any) {
    await this.notifications.markAllRead(req.tenant.id, req.user.sub);
  }

  @Post('users/push-token')
  @ApiOperation({ summary: 'Registrar push token do dispositivo' })
  @ApiResponse({ status: 200 })
  async registerPushToken(@Request() req: any, @Body() dto: RegisterPushTokenDto) {
    await this.notifications.savePushToken(req.user.sub, dto.token);
  }

  // ─── Avisos ──────────────────────────────────────────────────────────────────

  @Post('announcements')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Criar aviso geral (admin)' })
  @ApiResponse({ status: 201, description: 'Aviso criado' })
  createAnnouncement(@Request() req: any, @Body() dto: CreateAnnouncementDto) {
    return this.announcements.create(req.tenant.id, req.user.sub, dto);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'Listar avisos para o role do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de avisos' })
  findAnnouncements(@Request() req: any) {
    return this.announcements.findForRole(req.tenant.id, req.user.role ?? req.user.roles?.[0] ?? 'student');
  }

  @Get('announcements/all')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Listar todos os avisos (admin)' })
  @ApiResponse({ status: 200, description: 'Lista completa de avisos' })
  findAllAnnouncements(@Request() req: any) {
    return this.announcements.findAll(req.tenant.id);
  }

  @Delete('announcements/:id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Excluir aviso' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204 })
  async removeAnnouncement(@Request() req: any, @Param('id') id: string) {
    await this.announcements.remove(req.tenant.id, id);
  }
}

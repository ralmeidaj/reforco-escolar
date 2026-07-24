import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendInviteDto } from './dto/send-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Cadastro de usuário no tenant' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  async signup(@Req() req: any, @Res({ passthrough: true }) res: any, @Body() dto: SignupDto) {
    const tenantId = req.tenant?.id;
    const result = await this.authService.signup(tenantId, dto);
    this.setAccessCookie(res, result.accessToken);
    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login de usuário' })
  @ApiResponse({ status: 200, description: 'Login bem-sucedido' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Req() req: any, @Res({ passthrough: true }) res: any, @Body() dto: LoginDto) {
    const tenantId = req.tenant?.id;
    const result = await this.authService.login(tenantId, dto);
    this.setAccessCookie(res, result.accessToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token (web — cookie)' })
  @ApiResponse({ status: 200, description: 'Token renovado' })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Body('refreshToken') refreshToken: string,
  ) {
    const userId = req.user?.sub ?? req.body?.userId;
    const result = await this.authService.refresh(userId, refreshToken);
    this.setAccessCookie(res, result.accessToken);
    return result;
  }

  @Public()
  @Post('refresh/mobile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token (mobile — body)' })
  @ApiResponse({ status: 200, description: 'Token renovado' })
  @ApiBody({
    schema: { properties: { userId: { type: 'string' }, refreshToken: { type: 'string' } } },
  })
  async refreshMobile(
    @Body('userId') userId: string,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.refresh(userId, refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Solicitar link de recuperação de senha' })
  @ApiResponse({ status: 204, description: 'E-mail enviado se o endereço estiver cadastrado' })
  async forgotPassword(@Req() req: any, @Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(req.tenant?.id, dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiResponse({ status: 204, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async resetPassword(@Req() req: any, @Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(req.tenant?.id, dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async me(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @ApiBearerAuth()
  @Patch('profile')
  @ApiOperation({ summary: 'Atualizar perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado' })
  @ApiResponse({ status: 400, description: 'Senha atual incorreta' })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso' })
  async updateProfile(@Req() req: any, @Body() body: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    return this.authService.updateProfile(req.user.sub, body);
  }

  @ApiBearerAuth()
  @Roles('tenant_admin')
  @Post('invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Convidar usuário por e-mail' })
  @ApiResponse({ status: 204, description: 'Convite enviado' })
  @ApiResponse({ status: 409, description: 'Usuário já cadastrado' })
  async sendInvite(@Req() req: any, @Body() dto: SendInviteDto) {
    await this.authService.sendInvite(req.tenant.id, req.tenant.slug, req.user.sub, dto);
  }

  @Public()
  @Post('invite/accept')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Aceitar convite e criar conta' })
  @ApiResponse({ status: 201, description: 'Conta criada' })
  @ApiResponse({ status: 400, description: 'Convite inválido ou expirado' })
  async acceptInvite(@Res({ passthrough: true }) res: any, @Body() dto: AcceptInviteDto) {
    const result = await this.authService.acceptInvite(dto);
    this.setAccessCookie(res, result.accessToken);
    return result;
  }

  @ApiBearerAuth()
  @Roles('tenant_admin')
  @Get('users')
  @ApiOperation({ summary: 'Listar usuários do tenant por role' })
  @ApiQuery({ name: 'role', required: false, enum: ['teacher', 'student', 'guardian', 'tenant_admin'] })
  @ApiResponse({ status: 200 })
  listUsers(@Req() req: any, @Query('role') role?: string) {
    return this.authService.listUsers(req.tenant.id, role);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout — revoga todos os refresh tokens' })
  @ApiResponse({ status: 204 })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    await this.authService.logout(req.user.sub);
    res.clearCookie('access_token');
  }

  private setAccessCookie(res: any, token: string) {
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
  }
}

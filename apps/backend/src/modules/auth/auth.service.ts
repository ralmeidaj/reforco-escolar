import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Resend } from 'resend';
import { User, UserRole } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import type Redis from 'ioredis';

@Injectable()
export class AuthService {
  private resend: Resend | null;

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private config: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    const key = config.get<string>('RESEND_API_KEY');
    this.resend = key ? new Resend(key) : null;
  }

  async signup(tenantId: string, dto: SignupDto) {
    const exists = await this.usersRepo.findOne({ where: { tenantId, email: dto.email } });
    if (exists) throw new ConflictException('E-mail já cadastrado nesta escola');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({ ...dto, tenantId, passwordHash, role: dto.role as UserRole });
    await this.usersRepo.save(user);
    return this.generateTokens(user);
  }

  async login(tenantId: string, dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { tenantId, email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.generateTokens(user);
  }

  async refresh(userId: string, rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    let stored: RefreshToken | null = null;
    try {
      stored = await this.refreshTokensRepo.findOne({
        where: { userId, tokenHash, revoked: false },
        relations: { user: true },
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    stored.revoked = true;
    await this.refreshTokensRepo.save(stored);
    return this.generateTokens(stored.user);
  }

  async logout(userId: string) {
    await this.refreshTokensRepo.update({ userId, revoked: false }, { revoked: true });
  }

  async forgotPassword(tenantId: string, dto: ForgotPasswordDto) {
    const user = await this.usersRepo.findOne({ where: { tenantId, email: dto.email } });
    // Sempre responde 200 para não vazar se o e-mail existe
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    const redisKey = `${tenantId}:reset:${token}`;
    await this.redis.setex(redisKey, 86400, user.id); // TTL 24h

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (this.resend) {
      await this.resend.emails.send({
        from: 'noreply@reforcos.app',
        to: user.email,
        subject: 'Redefinir senha — Reforços Escolares',
        html: `<p>Clique no link abaixo para redefinir sua senha (válido por 24h):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } else {
      // Dev sem RESEND_API_KEY configurada
      console.log(`[AUTH] reset link: ${resetUrl}`);
    }
  }

  async resetPassword(tenantId: string, dto: ResetPasswordDto) {
    const redisKey = `${tenantId}:reset:${dto.token}`;
    const userId = await this.redis.get(redisKey);
    if (!userId) throw new BadRequestException('Token inválido ou expirado');

    const user = await this.usersRepo.findOne({ where: { id: userId, tenantId } });
    if (!user) throw new BadRequestException('Token inválido ou expirado');

    user.passwordHash = await bcrypt.hash(dto.password, 10);
    await this.usersRepo.save(user);
    await this.redis.del(redisKey);
    await this.refreshTokensRepo.update({ userId, revoked: false }, { revoked: true });
  }

  listUsers(tenantId: string, role?: string) {
    const where: any = { tenantId };
    if (role) where.role = role;
    return this.usersRepo.find({ where, order: { name: 'ASC' }, select: { id: true, name: true, email: true, role: true } });
  }

  async getProfile(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
  }

  async updateProfile(userId: string, dto: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (dto.newPassword) {
      if (!dto.currentPassword) throw new BadRequestException('Informe a senha atual para alterar a senha');
      const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!valid) throw new BadRequestException('Senha atual incorreta');
      user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    if (dto.name) user.name = dto.name;
    if (dto.email && dto.email !== user.email) {
      const exists = await this.usersRepo.findOne({ where: { tenantId: user.tenantId, email: dto.email } });
      if (exists) throw new ConflictException('E-mail já está em uso');
      user.email = dto.email;
    }

    await this.usersRepo.save(user);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.refreshTokensRepo.save(
      this.refreshTokensRepo.create({ userId: user.id, tokenHash, expiresAt }),
    );

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}

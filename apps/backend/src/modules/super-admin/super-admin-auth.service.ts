import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { authenticator } = require('otplib') as {
  authenticator: {
    generateSecret(): string;
    keyuri(user: string, service: string, secret: string): string;
    check(token: string, secret: string): boolean;
    generate(secret: string): string;
  };
};
import * as QRCode from 'qrcode';
import { SuperAdmin } from './super-admin.entity';
import {
  SuperAdminLoginDto,
  SuperAdminVerifyTotpDto,
  SuperAdminSetupTotpDto,
} from './dto/super-admin-auth.dto';

@Injectable()
export class SuperAdminAuthService {
  constructor(
    @InjectRepository(SuperAdmin)
    private repo: Repository<SuperAdmin>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: SuperAdminLoginDto) {
    const admin = await this.repo.findOne({ where: { email: dto.email, active: true } });
    if (!admin) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    if (admin.totpEnabled) {
      // Emite token temporário sem role super_admin — força verificação TOTP
      const tempToken = this.jwtService.sign(
        { sub: admin.id, email: admin.email, role: 'super_admin_pending' },
        { expiresIn: '5m' },
      );
      return { requireTotp: true, tempToken };
    }

    return { requireTotp: false, accessToken: this.issueToken(admin) };
  }

  async verifyTotp(dto: SuperAdminVerifyTotpDto) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Token temporário inválido ou expirado');
    }
    if (payload.role !== 'super_admin_pending') throw new UnauthorizedException();

    const admin = await this.repo.findOne({ where: { id: payload.sub, active: true } });
    if (!admin?.totpSecret) throw new UnauthorizedException();

    const ok = authenticator.check(dto.token, admin.totpSecret);
    if (!ok) throw new UnauthorizedException('Código TOTP inválido');

    return { accessToken: this.issueToken(admin) };
  }

  async setupTotp(adminId: string) {
    const admin = await this.repo.findOne({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException();
    if (admin.totpEnabled) throw new ConflictException('TOTP já está ativado');

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(admin.email, 'ReforçosEscolares', secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    // Salva o segredo mas ainda não ativa — só ativa ao confirmar com um código
    admin.totpSecret = secret;
    await this.repo.save(admin);

    return { secret, qrDataUrl };
  }

  async confirmTotp(adminId: string, dto: SuperAdminSetupTotpDto) {
    const admin = await this.repo.findOne({ where: { id: adminId } });
    if (!admin?.totpSecret) throw new BadRequestException('Inicie o setup do TOTP primeiro');

    const ok = authenticator.check(dto.token, admin.totpSecret);
    if (!ok) throw new BadRequestException('Código TOTP inválido');

    admin.totpEnabled = true;
    await this.repo.save(admin);
    return { message: 'TOTP ativado com sucesso' };
  }

  async seed(email: string, password: string, name: string) {
    const exists = await this.repo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Super admin já existe');

    const hash = await bcrypt.hash(password, 10);
    const admin = this.repo.create({ email, password: hash, name });
    return this.repo.save(admin);
  }

  async getMe(adminId: string) {
    const admin = await this.repo.findOne({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException();
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      totpEnabled: admin.totpEnabled,
    };
  }

  private issueToken(admin: SuperAdmin) {
    return this.jwtService.sign(
      { sub: admin.id, email: admin.email, role: 'super_admin' },
      { expiresIn: '4h' },
    );
  }

  generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }
}

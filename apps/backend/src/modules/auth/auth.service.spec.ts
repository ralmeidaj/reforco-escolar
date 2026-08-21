import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { Invite } from './invite.entity';
import { Tenant } from '../tenants/tenant.entity';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

const mockUsersRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn(),
};

const mockRefreshTokensRepo = {
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn(),
  update: jest.fn(),
};

const mockInviteRepo = {
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn(),
};

const mockTenantsRepo = {
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
};

const mockJwtService = { sign: jest.fn().mockReturnValue('mock.jwt.token') };

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test_secret'),
  get: jest.fn().mockReturnValue(undefined),
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokensRepo },
        { provide: getRepositoryToken(Invite), useValue: mockInviteRepo },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantsRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    it('cria usuário e retorna tokens', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);
      mockUsersRepo.save.mockResolvedValue({
        id: 'user-1', name: 'João', email: 'joao@test.com', role: 'student', tenantId: 'tenant-1',
      });
      mockRefreshTokensRepo.save.mockResolvedValue({});

      const result = await service.signup('tenant-1', {
        name: 'João', email: 'joao@test.com', password: 'senha123', role: 'student',
      });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBeDefined();
      expect(mockUsersRepo.save).toHaveBeenCalledTimes(1);
    });

    it('lança ConflictException se e-mail já existe', async () => {
      mockUsersRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.signup('tenant-1', {
          name: 'João', email: 'joao@test.com', password: 'senha123', role: 'student',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('retorna tokens com credenciais válidas', async () => {
      const hash = await bcrypt.hash('senha123', 10);
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'user-1', email: 'joao@test.com', passwordHash: hash, role: 'student', tenantId: 'tenant-1', name: 'João',
      });
      mockRefreshTokensRepo.save.mockResolvedValue({});

      const result = await service.login('tenant-1', { email: 'joao@test.com', password: 'senha123' });
      expect(result.accessToken).toBe('mock.jwt.token');
    });

    it('lança UnauthorizedException se usuário não existe', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);
      await expect(service.login('tenant-1', { email: 'x@x.com', password: 'errada' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException se senha incorreta', async () => {
      const hash = await bcrypt.hash('certa', 10);
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'user-1', email: 'x@x.com', passwordHash: hash, role: 'student', tenantId: 'tenant-1', name: 'X',
      });
      await expect(service.login('tenant-1', { email: 'x@x.com', password: 'errada' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revoga todos os refresh tokens do usuário', async () => {
      mockRefreshTokensRepo.update.mockResolvedValue({ affected: 2 });
      await service.logout('user-1');
      expect(mockRefreshTokensRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', revoked: false },
        { revoked: true },
      );
    });
  });

  describe('refresh', () => {
    it('lança UnauthorizedException se token não existe', async () => {
      mockRefreshTokensRepo.findOne.mockResolvedValue(null);
      await expect(service.refresh('user-1', 'invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException se token expirado', async () => {
      mockRefreshTokensRepo.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-1', email: 'x@x.com', role: 'student', tenantId: 't1', name: 'X' },
        revoked: false,
      });
      await expect(service.refresh('user-1', 'some-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('não faz nada se e-mail não existe em nenhum tenant (sem vazar informação)', async () => {
      mockUsersRepo.find.mockResolvedValue([]);
      await expect(
        service.forgotPassword({ email: 'naoexiste@test.com' }),
      ).resolves.toBeUndefined();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('grava token no Redis com tenantId:userId se usuário existe', async () => {
      mockUsersRepo.find.mockResolvedValue([
        { id: 'user-1', email: 'joao@test.com', tenantId: 'tenant-1', name: 'João' },
      ]);
      mockTenantsRepo.findOne.mockResolvedValue({ id: 'tenant-1', slug: 'escola-a', name: 'Escola A' });

      await service.forgotPassword({ email: 'joao@test.com' });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^reset:/),
        86400,
        'tenant-1:user-1',
      );
    });

    it('envia um token por tenant quando o e-mail existe em mais de uma escola', async () => {
      mockUsersRepo.find.mockResolvedValue([
        { id: 'user-1', email: 'joao@test.com', tenantId: 'tenant-1', name: 'João' },
        { id: 'user-2', email: 'joao@test.com', tenantId: 'tenant-2', name: 'João' },
      ]);
      mockTenantsRepo.findOne.mockResolvedValue({ id: 'tenant-x', slug: 'x', name: 'X' });

      await service.forgotPassword({ email: 'joao@test.com' });

      expect(mockRedis.setex).toHaveBeenCalledTimes(2);
      expect(mockRedis.setex).toHaveBeenCalledWith(expect.any(String), 86400, 'tenant-1:user-1');
      expect(mockRedis.setex).toHaveBeenCalledWith(expect.any(String), 86400, 'tenant-2:user-2');
    });
  });

  describe('resetPassword', () => {
    it('lança BadRequestException se token não existe no Redis', async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'invalid', password: 'nova-senha123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('atualiza senha e revoga refresh tokens, resolvendo o tenant pelo valor gravado no Redis', async () => {
      mockRedis.get.mockResolvedValue('tenant-1:user-1');
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'user-1', tenantId: 'tenant-1', passwordHash: 'old-hash',
      });
      mockUsersRepo.save.mockResolvedValue({});
      mockRefreshTokensRepo.update.mockResolvedValue({ affected: 1 });

      await service.resetPassword({ token: 'valid-token', password: 'nova-senha123' });

      expect(mockUsersRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1', tenantId: 'tenant-1' } });
      expect(mockUsersRepo.save).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith('reset:valid-token');
      expect(mockRefreshTokensRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', revoked: false },
        { revoked: true },
      );
    });
  });

  describe('loginMobile', () => {
    it('retorna tokens e tenantSlug quando há um único match', async () => {
      const hash = await bcrypt.hash('senha123', 10);
      mockUsersRepo.find.mockResolvedValue([
        { id: 'user-1', email: 'joao@test.com', passwordHash: hash, role: 'student', tenantId: 'tenant-1', name: 'João' },
      ]);
      mockTenantsRepo.findOne.mockResolvedValue({ id: 'tenant-1', slug: 'escola-silva', name: 'Escola Silva' });
      mockRefreshTokensRepo.save.mockResolvedValue({});

      const result = await service.loginMobile({ email: 'joao@test.com', password: 'senha123' });

      expect((result as any).accessToken).toBe('mock.jwt.token');
      expect((result as any).tenantSlug).toBe('escola-silva');
    });

    it('retorna requireTenantSelection quando e-mail está em múltiplos tenants', async () => {
      const hash = await bcrypt.hash('senha123', 10);
      mockUsersRepo.find.mockResolvedValue([
        { id: 'user-1', email: 'joao@test.com', passwordHash: hash, tenantId: 'tenant-1' },
        { id: 'user-2', email: 'joao@test.com', passwordHash: hash, tenantId: 'tenant-2' },
      ]);
      mockTenantsRepo.find.mockResolvedValue([
        { id: 'tenant-1', slug: 'escola-a', name: 'Escola A' },
        { id: 'tenant-2', slug: 'escola-b', name: 'Escola B' },
      ]);

      const result = await service.loginMobile({ email: 'joao@test.com', password: 'senha123' });

      expect((result as any).requireTenantSelection).toBe(true);
      expect((result as any).tenants).toHaveLength(2);
    });

    it('lança UnauthorizedException se senha incorreta', async () => {
      const hash = await bcrypt.hash('certa', 10);
      mockUsersRepo.find.mockResolvedValue([
        { id: 'user-1', email: 'joao@test.com', passwordHash: hash, tenantId: 'tenant-1' },
      ]);

      await expect(service.loginMobile({ email: 'joao@test.com', password: 'errada' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('retorna dados do usuário', async () => {
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'user-1', name: 'João', email: 'joao@test.com', role: 'student', avatarUrl: null,
      });

      const result = await service.getProfile('user-1');
      expect(result.id).toBe('user-1');
      expect(result.role).toBe('student');
    });

    it('lança UnauthorizedException se usuário não existe', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('ghost')).rejects.toThrow(UnauthorizedException);
    });
  });
});

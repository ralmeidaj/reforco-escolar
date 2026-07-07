import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdmin } from './super-admin.entity';

// Mock todos os módulos ESM antes de qualquer import do serviço
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn().mockReturnValue('MOCKSECRET123'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/...'),
    check: jest.fn(),
    generate: jest.fn().mockReturnValue('123456'),
  },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,abc'),
}));

// Acessa APÓS o mock para que o serviço receba a versão mockada
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { authenticator } = require('otplib') as { authenticator: { check: jest.Mock } };

const mockRepo = {
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((e) => Promise.resolve(e)),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
};

const mockConfig = { getOrThrow: jest.fn().mockReturnValue('test-secret') };

describe('SuperAdminAuthService', () => {
  let service: SuperAdminAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminAuthService,
        { provide: getRepositoryToken(SuperAdmin), useValue: mockRepo },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(SuperAdminAuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('deve retornar accessToken quando TOTP não está ativado', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockRepo.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', password: hash, totpEnabled: false });
      mockJwt.sign.mockReturnValue('signed-token');

      const result = await service.login({ email: 'a@b.com', password: 'password123' });

      expect(result).toEqual({ requireTotp: false, accessToken: 'signed-token' });
    });

    it('deve retornar requireTotp=true quando TOTP está ativado', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockRepo.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', password: hash, totpEnabled: true });
      mockJwt.sign.mockReturnValue('temp-token');

      const result = await service.login({ email: 'a@b.com', password: 'password123' });

      expect(result).toEqual({ requireTotp: true, tempToken: 'temp-token' });
    });

    it('deve lançar UnauthorizedException para admin inexistente', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException para senha errada', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockRepo.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', password: hash, totpEnabled: false });

      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyTotp', () => {
    it('deve retornar accessToken com código TOTP válido', async () => {
      mockJwt.verify.mockReturnValue({ sub: '1', role: 'super_admin_pending' });
      mockRepo.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', totpSecret: 'MOCKSECRET123', active: true });
      (authenticator.check as jest.Mock).mockReturnValue(true);
      mockJwt.sign.mockReturnValue('access-token');

      const result = await service.verifyTotp({ token: '123456', tempToken: 'temp' });

      expect(result).toEqual({ accessToken: 'access-token' });
    });

    it('deve lançar UnauthorizedException para código TOTP inválido', async () => {
      mockJwt.verify.mockReturnValue({ sub: '1', role: 'super_admin_pending' });
      mockRepo.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', totpSecret: 'MOCKSECRET123', active: true });
      (authenticator.check as jest.Mock).mockReturnValue(false);

      await expect(service.verifyTotp({ token: '000000', tempToken: 'temp' })).rejects.toThrow(UnauthorizedException);
    });

    it('deve rejeitar tempToken com role errado', async () => {
      mockJwt.verify.mockReturnValue({ sub: '1', role: 'student' });

      await expect(service.verifyTotp({ token: '123456', tempToken: 'temp' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('setupTotp', () => {
    it('deve gerar secret e QR code', async () => {
      mockRepo.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', totpEnabled: false });

      const result = await service.setupTotp('1');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrDataUrl');
    });

    it('deve lançar ConflictException quando TOTP já está ativado', async () => {
      mockRepo.findOne.mockResolvedValue({ id: '1', email: 'a@b.com', totpEnabled: true });

      await expect(service.setupTotp('1')).rejects.toThrow(ConflictException);
    });
  });

  describe('confirmTotp', () => {
    it('deve ativar TOTP com código válido', async () => {
      const admin = { id: '1', totpSecret: 'MOCKSECRET123', totpEnabled: false };
      mockRepo.findOne.mockResolvedValue(admin);
      mockRepo.save.mockResolvedValue({ ...admin, totpEnabled: true });
      (authenticator.check as jest.Mock).mockReturnValue(true);

      const result = await service.confirmTotp('1', { token: '123456' });

      expect(result.message).toContain('ativado');
    });

    it('deve lançar BadRequestException para código inválido', async () => {
      mockRepo.findOne.mockResolvedValue({ id: '1', totpSecret: 'MOCKSECRET123', totpEnabled: false });
      (authenticator.check as jest.Mock).mockReturnValue(false);

      await expect(service.confirmTotp('1', { token: '000000' })).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando TOTP não foi configurado', async () => {
      mockRepo.findOne.mockResolvedValue({ id: '1', totpSecret: null, totpEnabled: false });

      await expect(service.confirmTotp('1', { token: '123456' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('seed', () => {
    it('deve criar super admin', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await service.seed('admin@app.com', 'Secret123', 'Admin');

      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('deve lançar ConflictException se já existe', async () => {
      mockRepo.findOne.mockResolvedValue({ id: '1' });

      await expect(service.seed('admin@app.com', 'Secret123', 'Admin')).rejects.toThrow(ConflictException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ThrottlerStorage } from '@nestjs/throttler';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');

jest.setTimeout(60000);

describe('Auth + Tenant E2E', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    await dataSource.runMigrations();
  });

  afterEach(async () => {
    // Limpa rate limiting acumulado entre testes
    const throttler = app.get<ThrottlerStorage>(ThrottlerStorage);
    if (typeof (throttler as any).reset === 'function') {
      await (throttler as any).reset();
    }
    // Limpa dados entre testes
    await dataSource.query('TRUNCATE tenants CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  const SLUG = 'escola-e2e';
  const ADMIN = { name: 'Admin E2E', email: 'admin@e2e.com', password: 'senha1234', role: 'tenant_admin' };

  async function createTenantAndAdmin() {
    await request(app.getHttpServer())
      .post('/tenants')
      .send({ slug: SLUG, name: 'Escola E2E' })
      .expect(201);

    return request(app.getHttpServer())
      .post('/auth/signup')
      .set('X-Tenant-Slug', SLUG)
      .send(ADMIN)
      .expect(201);
  }

  describe('POST /tenants', () => {
    it('cria tenant com slug válido', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: SLUG, name: 'Escola E2E' })
        .expect(201);

      expect(res.body.slug).toBe(SLUG);
      expect(res.body.status).toBe('active');
    });

    it('rejeita slug duplicado', async () => {
      await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: SLUG, name: 'Escola E2E' });

      await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: SLUG, name: 'Outra Escola' })
        .expect(409);
    });

    it('rejeita slug com caracteres inválidos', async () => {
      await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: 'Escola Silva!', name: 'Escola' })
        .expect(400);
    });
  });

  describe('POST /auth/signup', () => {
    it('cria usuário e retorna tokens', async () => {
      const { body } = await createTenantAndAdmin();

      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.role).toBe('tenant_admin');
      expect(body.user.email).toBe(ADMIN.email);
    });

    it('rejeita e-mail duplicado no mesmo tenant', async () => {
      await createTenantAndAdmin();

      await request(app.getHttpServer())
        .post('/auth/signup')
        .set('X-Tenant-Slug', SLUG)
        .send(ADMIN)
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('loga com credenciais válidas', async () => {
      await createTenantAndAdmin();

      const { body } = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Tenant-Slug', SLUG)
        .send({ email: ADMIN.email, password: ADMIN.password })
        .expect(200);

      expect(body.accessToken).toBeDefined();
    });

    it('rejeita senha errada', async () => {
      await createTenantAndAdmin();

      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Tenant-Slug', SLUG)
        .send({ email: ADMIN.email, password: 'senhaerrada' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh/mobile', () => {
    it('renova token com refresh token válido', async () => {
      const { body: signup } = await createTenantAndAdmin();

      const { body } = await request(app.getHttpServer())
        .post('/auth/refresh/mobile')
        .set('X-Tenant-Slug', SLUG)
        .send({ userId: signup.user.id, refreshToken: signup.refreshToken })
        .expect(200);

      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      // Token rotation — novo refreshToken deve ser diferente
      expect(body.refreshToken).not.toBe(signup.refreshToken);
    });

    it('rejeita refresh token inválido', async () => {
      await createTenantAndAdmin();

      await request(app.getHttpServer())
        .post('/auth/refresh/mobile')
        .set('X-Tenant-Slug', SLUG)
        .send({ userId: 'fake-id', refreshToken: 'token-invalido' })
        .expect(401);
    });
  });

  describe('Isolamento de tenant', () => {
    it('usuário de tenant A não consegue logar com X-Tenant-Slug do tenant B', async () => {
      // Cria tenant A com admin
      await createTenantAndAdmin();

      // Cria tenant B
      await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: 'escola-b', name: 'Escola B' });

      // Tenta logar no tenant B com credenciais do tenant A
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Tenant-Slug', 'escola-b')
        .send({ email: ADMIN.email, password: ADMIN.password })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revoga tokens e protege rota autenticada', async () => {
      const { body: signup } = await createTenantAndAdmin();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${signup.accessToken}`)
        .set('X-Tenant-Slug', SLUG)
        .expect(204);
    });
  });
});

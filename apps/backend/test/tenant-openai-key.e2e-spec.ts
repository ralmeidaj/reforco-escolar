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

function decodeJwt(token: string): { sub: string; tenantId: string } {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

describe('Tenant OpenAI Key E2E', () => {
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
    const throttler = app.get<ThrottlerStorage>(ThrottlerStorage);
    if (typeof (throttler as any).reset === 'function') await (throttler as any).reset();
    await dataSource.query('TRUNCATE tenants CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  async function setup(slug: string) {
    await request(app.getHttpServer())
      .post('/tenants')
      .send({ slug, name: `Escola ${slug}` })
      .expect(201);

    const { body: admin } = await request(app.getHttpServer())
      .post('/auth/signup')
      .set('X-Tenant-Slug', slug)
      .send({ name: 'Admin', email: 'admin@test.com', password: 'senha1234', role: 'tenant_admin' })
      .expect(201);

    const { body: teacher } = await request(app.getHttpServer())
      .post('/auth/signup')
      .set('X-Tenant-Slug', slug)
      .send({ name: 'Professor João', email: 'joao@test.com', password: 'senha1234', role: 'teacher' })
      .expect(201);

    const { body: student } = await request(app.getHttpServer())
      .post('/auth/signup')
      .set('X-Tenant-Slug', slug)
      .send({ name: 'Aluno Maria', email: 'maria@test.com', password: 'senha1234', role: 'student' })
      .expect(201);

    return {
      adminToken: admin.accessToken,
      teacherToken: teacher.accessToken,
      studentToken: student.accessToken,
    };
  }

  it('tenant_admin salva, consulta e remove a própria chave', async () => {
    const slug = 'openai-key-basic';
    const { adminToken } = await setup(slug);
    const fakeKey = 'sk-fake-openai-key-1234567890';

    const { body: afterSet } = await request(app.getHttpServer())
      .put('/tenants/me/openai-key')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', slug)
      .send({ apiKey: fakeKey })
      .expect(200);

    expect(afterSet).toEqual({ hasKey: true, keyPreview: '7890' });
    expect(JSON.stringify(afterSet)).not.toContain(fakeKey);

    const { body: status } = await request(app.getHttpServer())
      .get('/tenants/me/openai-key')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', slug)
      .expect(200);

    expect(status).toEqual({ hasKey: true, keyPreview: '7890' });

    await request(app.getHttpServer())
      .delete('/tenants/me/openai-key')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', slug)
      .expect(204);

    const { body: statusAfterRemove } = await request(app.getHttpServer())
      .get('/tenants/me/openai-key')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', slug)
      .expect(200);

    expect(statusAfterRemove).toEqual({ hasKey: false, keyPreview: null });
  });

  it('a chave é armazenada criptografada no banco (nunca em texto puro)', async () => {
    const slug = 'openai-key-encrypted';
    const { adminToken } = await setup(slug);
    const fakeKey = 'sk-fake-openai-key-abcdefghij';

    await request(app.getHttpServer())
      .put('/tenants/me/openai-key')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', slug)
      .send({ apiKey: fakeKey })
      .expect(200);

    const { tenantId } = decodeJwt(adminToken);
    const rows = await dataSource.query('SELECT openai_api_key_encrypted FROM tenants WHERE id = $1', [tenantId]);

    expect(rows[0].openai_api_key_encrypted).toBeTruthy();
    expect(rows[0].openai_api_key_encrypted).not.toBe(fakeKey);
    expect(rows[0].openai_api_key_encrypted).not.toContain(fakeKey);
  });

  it('teacher e student não podem gerenciar a chave (403)', async () => {
    const slug = 'openai-key-forbidden';
    const { teacherToken, studentToken } = await setup(slug);

    for (const token of [teacherToken, studentToken]) {
      await request(app.getHttpServer())
        .get('/tenants/me/openai-key')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', slug)
        .expect(403);

      await request(app.getHttpServer())
        .put('/tenants/me/openai-key')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', slug)
        .send({ apiKey: 'sk-fake-openai-key-1234567890' })
        .expect(403);

      await request(app.getHttpServer())
        .delete('/tenants/me/openai-key')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', slug)
        .expect(403);
    }
  });

  it('isolamento: tenant B não vê a chave configurada pelo tenant A', async () => {
    const { adminToken: adminA } = await setup('openai-key-iso-a');

    await request(app.getHttpServer())
      .put('/tenants/me/openai-key')
      .set('Authorization', `Bearer ${adminA}`)
      .set('X-Tenant-Slug', 'openai-key-iso-a')
      .send({ apiKey: 'sk-fake-openai-key-do-tenant-a' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/tenants')
      .send({ slug: 'openai-key-iso-b', name: 'Escola B' });
    const { body: adminB } = await request(app.getHttpServer())
      .post('/auth/signup')
      .set('X-Tenant-Slug', 'openai-key-iso-b')
      .send({ name: 'Admin B', email: 'adminb@test.com', password: 'senha1234', role: 'tenant_admin' });

    const { body: statusB } = await request(app.getHttpServer())
      .get('/tenants/me/openai-key')
      .set('Authorization', `Bearer ${adminB.accessToken}`)
      .set('X-Tenant-Slug', 'openai-key-iso-b')
      .expect(200);

    expect(statusB).toEqual({ hasKey: false, keyPreview: null });
  });
});

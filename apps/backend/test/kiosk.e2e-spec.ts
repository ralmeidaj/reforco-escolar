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

describe('Kiosk E2E', () => {
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
    if (typeof (throttler as any).reset === 'function') {
      await (throttler as any).reset();
    }
    await dataSource.query('TRUNCATE tenants CASCADE');
  });

  afterAll(async () => {
    await app.close();
  });

  const SLUG = 'escola-kiosk-e2e';
  const ADMIN = { name: 'Admin Kiosk', email: 'admin@kiosk-e2e.com', password: 'senha1234', role: 'tenant_admin' };
  const STUDENT = { name: 'Aluno Kiosk', email: 'aluno@kiosk-e2e.com', password: 'senha1234', role: 'student' };

  async function setup() {
    await request(app.getHttpServer())
      .post('/tenants')
      .send({ slug: SLUG, name: 'Escola Kiosk E2E' })
      .expect(201);

    const { body: signup } = await request(app.getHttpServer())
      .post('/auth/signup')
      .set('X-Tenant-Slug', SLUG)
      .send(ADMIN)
      .expect(201);

    const adminToken = signup.accessToken;

    const { body: student } = await request(app.getHttpServer())
      .post('/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', SLUG)
      .send(STUDENT)
      .expect(201);

    const { body: room } = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', SLUG)
      .send({ name: 'Sala Kiosk', capacity: 5 })
      .expect(201);

    return { adminToken, studentId: student.id, roomId: room.id };
  }

  describe('POST /kiosk/checkin + GET /kiosk/checked-in + POST /kiosk/checkout', () => {
    it('registra entrada, aparece na busca de check-in ativo, e some após o checkout', async () => {
      const { studentId, roomId } = await setup();

      await request(app.getHttpServer())
        .post('/kiosk/checkin')
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId, roomId })
        .expect(201);

      const { body: checkedIn } = await request(app.getHttpServer())
        .get('/kiosk/checked-in')
        .set('X-Tenant-Slug', SLUG)
        .query({ q: 'Aluno' })
        .expect(200);

      expect(checkedIn).toHaveLength(1);
      expect(checkedIn[0]).toMatchObject({ studentId, roomName: 'Sala Kiosk' });

      await request(app.getHttpServer())
        .post('/kiosk/checkout')
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId })
        .expect(204);

      const { body: afterCheckout } = await request(app.getHttpServer())
        .get('/kiosk/checked-in')
        .set('X-Tenant-Slug', SLUG)
        .query({ q: 'Aluno' })
        .expect(200);

      expect(afterCheckout).toEqual([]);
    });

    it('checkout de aluno sem check-in ativo não lança erro (idempotente)', async () => {
      const { studentId } = await setup();

      await request(app.getHttpServer())
        .post('/kiosk/checkout')
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId })
        .expect(204);
    });

    it('busca por menos de 2 caracteres não retorna resultados', async () => {
      const { studentId, roomId } = await setup();

      await request(app.getHttpServer())
        .post('/kiosk/checkin')
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId, roomId })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/kiosk/checked-in')
        .set('X-Tenant-Slug', SLUG)
        .query({ q: 'A' })
        .expect(200);

      expect(body).toEqual([]);
    });
  });

  describe('Isolamento de tenant', () => {
    it('busca de check-in não retorna alunos de outro tenant', async () => {
      const { studentId, roomId } = await setup();

      await request(app.getHttpServer())
        .post('/kiosk/checkin')
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId, roomId })
        .expect(201);

      await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: 'escola-b-kiosk', name: 'Escola B' })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/kiosk/checked-in')
        .set('X-Tenant-Slug', 'escola-b-kiosk')
        .query({ q: 'Aluno' })
        .expect(200);

      expect(body).toEqual([]);
    });
  });
});

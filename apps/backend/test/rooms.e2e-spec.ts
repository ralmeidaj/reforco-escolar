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

describe('Rooms — admin-checkin E2E', () => {
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

  const SLUG = 'escola-rooms-e2e';
  const ADMIN = { name: 'Admin Rooms', email: 'admin@rooms-e2e.com', password: 'senha1234', role: 'tenant_admin' };

  async function setup(capacity = 5) {
    await request(app.getHttpServer())
      .post('/tenants')
      .send({ slug: SLUG, name: 'Escola Rooms E2E' })
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
      .send({ name: 'Aluno Rooms', email: 'aluno@rooms-e2e.com', password: 'senha1234', role: 'student' })
      .expect(201);

    const { body: room } = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', SLUG)
      .send({ name: 'Sala Rooms', capacity })
      .expect(201);

    return { adminToken, studentId: student.id, roomId: room.id };
  }

  describe('POST /rooms/:id/admin-checkin', () => {
    it('admin adiciona o aluno na sala e ele aparece nos check-ins ativos', async () => {
      const { adminToken, studentId, roomId } = await setup();

      await request(app.getHttpServer())
        .post(`/rooms/${roomId}/admin-checkin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId })
        .expect(201);

      const { body: checkins } = await request(app.getHttpServer())
        .get('/rooms/checkins/active')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG)
        .expect(200);

      expect(checkins).toHaveLength(1);
      expect(checkins[0]).toMatchObject({ studentId, roomId });
    });

    it('rejeita quando a sala já está sem vagas', async () => {
      const { adminToken, studentId, roomId } = await setup(1);

      await request(app.getHttpServer())
        .post(`/rooms/${roomId}/admin-checkin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId })
        .expect(201);

      const { body: outroAluno } = await request(app.getHttpServer())
        .post('/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ name: 'Outro Aluno', email: 'outro@rooms-e2e.com', password: 'senha1234', role: 'student' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/rooms/${roomId}/admin-checkin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId: outroAluno.id })
        .expect(400);
    });

    it('retorna 404 se a sala não existe', async () => {
      const { adminToken, studentId } = await setup();

      await request(app.getHttpServer())
        .post('/rooms/00000000-0000-0000-0000-000000000000/admin-checkin')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId })
        .expect(404);
    });

    it('usuário sem role tenant_admin não pode chamar (professor)', async () => {
      const { adminToken, studentId, roomId } = await setup();

      const { body: teacher } = await request(app.getHttpServer())
        .post('/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ name: 'Prof Rooms', email: 'prof@rooms-e2e.com', password: 'senha1234', role: 'teacher' })
        .expect(201);
      void teacher;

      const { body: teacherLogin } = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Tenant-Slug', SLUG)
        .send({ email: 'prof@rooms-e2e.com', password: 'senha1234' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/rooms/${roomId}/admin-checkin`)
        .set('Authorization', `Bearer ${teacherLogin.accessToken}`)
        .set('X-Tenant-Slug', SLUG)
        .send({ studentId })
        .expect(403);
    });
  });
});

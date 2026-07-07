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

describe('Rooms & Scheduling E2E', () => {
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
      .send({ name: 'Professor', email: 'prof@test.com', password: 'senha1234', role: 'teacher' })
      .expect(201);

    const { body: student } = await request(app.getHttpServer())
      .post('/auth/signup')
      .set('X-Tenant-Slug', slug)
      .send({ name: 'Aluno', email: 'aluno@test.com', password: 'senha1234', role: 'student' })
      .expect(201);

    const { body: subject } = await request(app.getHttpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .set('X-Tenant-Slug', slug)
      .send({ name: 'Matemática', color: '#3B82F6' })
      .expect(201);

    return {
      adminToken: admin.accessToken,
      teacherToken: teacher.accessToken,
      teacherId: teacher.user.id,
      studentId: student.user.id,
      subjectId: subject.id,
    };
  }

  describe('Rooms CRUD', () => {
    it('admin cria, lista, atualiza e remove sala', async () => {
      const slug = 'spec3-rooms';
      const { adminToken } = await setup(slug);

      const { body: room } = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ name: 'Sala 01', capacity: 8 })
        .expect(201);

      expect(room.name).toBe('Sala 01');
      expect(room.capacity).toBe(8);

      // Listar
      const { body: list } = await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      expect(list).toHaveLength(1);

      // Atualizar
      const { body: updated } = await request(app.getHttpServer())
        .patch(`/rooms/${room.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ capacity: 12 })
        .expect(200);

      expect(updated.capacity).toBe(12);

      // Remover
      await request(app.getHttpServer())
        .delete(`/rooms/${room.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      const { body: empty } = await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      expect(empty).toHaveLength(0);
    });

    it('GET /rooms/occupancy retorna salas com currentOccupancy', async () => {
      const slug = 'spec3-occupancy';
      const { adminToken } = await setup(slug);

      await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ name: 'Sala A', capacity: 5 })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/rooms/occupancy')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      expect(body[0].currentOccupancy).toBe(0);
    });

    it('professor sem role tenant_admin não pode criar sala', async () => {
      const slug = 'spec3-rooms-rbac';
      const { teacherToken } = await setup(slug);

      await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ name: 'Sala Proibida', capacity: 5 })
        .expect(403);
    });
  });

  describe('Availability Slots', () => {
    it('admin cadastra horário recorrente do professor', async () => {
      const slug = 'spec3-slots';
      const { adminToken, teacherId } = await setup(slug);

      const { body: slot } = await request(app.getHttpServer())
        .post('/availability-slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ teacherId, dayOfWeek: 1, startTime: '08:00', endTime: '09:00', isRecurring: true })
        .expect(201);

      expect(slot.dayOfWeek).toBe(1);
      expect(slot.startTime).toMatch(/^08:00/);

      // Listar por professor
      const { body: list } = await request(app.getHttpServer())
        .get(`/availability-slots?teacherId=${teacherId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      expect(list).toHaveLength(1);

      // Remover
      await request(app.getHttpServer())
        .delete(`/availability-slots/${slot.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);
    });
  });

  describe('Sessions', () => {
    it('admin agenda sessão e atualiza status', async () => {
      const slug = 'spec3-sessions';
      const { adminToken, teacherId, studentId, subjectId } = await setup(slug);

      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { body: session } = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ teacherId, studentId, subjectId, scheduledAt, durationMinutes: 60 })
        .expect(201);

      expect(session.status).toBe('agendada');
      expect(session.teacherId).toBe(teacherId);

      // Confirmar
      const { body: confirmed } = await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ status: 'confirmada' })
        .expect(200);

      expect(confirmed.status).toBe('confirmada');
    });

    it('cancelamento sem motivo retorna 400', async () => {
      const slug = 'spec3-cancel';
      const { adminToken, teacherId, studentId, subjectId } = await setup(slug);

      const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { body: session } = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ teacherId, studentId, subjectId, scheduledAt })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ status: 'cancelada' })
        .expect(400);
    });

    it('cancelamento com motivo retorna 200', async () => {
      const slug = 'spec3-cancel-ok';
      const { adminToken, teacherId, studentId, subjectId } = await setup(slug);

      const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { body: session } = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ teacherId, studentId, subjectId, scheduledAt })
        .expect(201);

      const { body: cancelled } = await request(app.getHttpServer())
        .patch(`/sessions/${session.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ status: 'cancelada', cancelReason: 'Aluno doente' })
        .expect(200);

      expect(cancelled.status).toBe('cancelada');
      expect(cancelled.cancelReason).toBe('Aluno doente');
    });

    it('GET /sessions com filtro de data', async () => {
      const slug = 'spec3-sessions-list';
      const { adminToken, teacherId, studentId, subjectId } = await setup(slug);

      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ teacherId, studentId, subjectId, scheduledAt })
        .expect(201);

      const from = new Date().toISOString();
      const to   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { body: list } = await request(app.getHttpServer())
        .get(`/sessions?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      expect(list).toHaveLength(1);
      expect(list[0].teacher.name).toBe('Professor');
    });
  });

  describe('Isolamento de tenant — Spec 3', () => {
    it('sala do tenant A não aparece no tenant B', async () => {
      const { adminToken: tokenA } = await setup('spec3-iso-a');

      await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: 'spec3-iso-b', name: 'Escola B' });
      const { body: adminB } = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('X-Tenant-Slug', 'spec3-iso-b')
        .send({ name: 'Admin B', email: 'adminb@test.com', password: 'senha1234', role: 'tenant_admin' });

      await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Slug', 'spec3-iso-a')
        .send({ name: 'Sala Secreta', capacity: 5 })
        .expect(201);

      const { body: roomsB } = await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${adminB.accessToken}`)
        .set('X-Tenant-Slug', 'spec3-iso-b')
        .expect(200);

      expect(roomsB).toHaveLength(0);
    });
  });
});

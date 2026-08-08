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

describe('Activity Correction E2E', () => {
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
      studentId: student.user.id,
    };
  }

  async function insertCorrection(tenantId: string, studentId: string, createdBy: string, overrides: Record<string, any> = {}) {
    const rows = await dataSource.query(
      `INSERT INTO activity_corrections (tenant_id, student_id, created_by, subject, grade_level, image_url, score, summary, voice_orientation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        tenantId,
        studentId,
        createdBy,
        overrides.subject ?? 'Matemática',
        overrides.gradeLevel ?? '5º ano',
        overrides.imageUrl ?? '/uploads/fake.jpg',
        overrides.score ?? '8/10',
        overrides.summary ?? 'Bom desempenho geral.',
        overrides.voiceOrientation ?? 'Parabéns pelo esforço!',
      ],
    );
    return rows[0].id as string;
  }

  it('professor vê o histórico de correções de um aluno', async () => {
    const slug = 'correction-basic';
    const { teacherToken, studentId } = await setup(slug);
    const { tenantId, sub: teacherId } = decodeJwt(teacherToken);

    await insertCorrection(tenantId, studentId, teacherId, { subject: 'Português' });

    const { body: list } = await request(app.getHttpServer())
      .get(`/ai/activity-corrections/student/${studentId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .set('X-Tenant-Slug', slug)
      .expect(200);

    expect(list).toHaveLength(1);
    expect(list[0].subject).toBe('Português');
  });

  it('aluno não pode acionar o corretor de atividades (403)', async () => {
    const slug = 'correction-forbidden';
    const { studentToken, studentId } = await setup(slug);

    await request(app.getHttpServer())
      .post('/ai/activity-corrections')
      .set('Authorization', `Bearer ${studentToken}`)
      .set('X-Tenant-Slug', slug)
      .field('studentId', studentId)
      .field('subject', 'Matemática')
      .expect(403);
  });

  it('admin exclui uma correção do histórico', async () => {
    const slug = 'correction-delete';
    const { adminToken, studentId } = await setup(slug);
    const { tenantId, sub: adminId } = decodeJwt(adminToken);

    const id = await insertCorrection(tenantId, studentId, adminId);

    await request(app.getHttpServer())
      .delete(`/ai/activity-corrections/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', slug)
      .expect(204);

    const { body: list } = await request(app.getHttpServer())
      .get(`/ai/activity-corrections/student/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Slug', slug)
      .expect(200);

    expect(list).toHaveLength(0);
  });

  it('isolamento: tenant B não vê correção do tenant A', async () => {
    const { teacherToken: teacherA, studentId: studentIdA } = await setup('correction-iso-a');
    const { tenantId: tenantIdA, sub: teacherIdA } = decodeJwt(teacherA);

    await insertCorrection(tenantIdA, studentIdA, teacherIdA, { subject: 'Segredo do tenant A' });

    await request(app.getHttpServer())
      .post('/tenants')
      .send({ slug: 'correction-iso-b', name: 'Escola B' });
    const { body: teacherB } = await request(app.getHttpServer())
      .post('/auth/signup')
      .set('X-Tenant-Slug', 'correction-iso-b')
      .send({ name: 'Professor B', email: 'profb@test.com', password: 'senha1234', role: 'teacher' });

    const { body: listB } = await request(app.getHttpServer())
      .get(`/ai/activity-corrections/student/${studentIdA}`)
      .set('Authorization', `Bearer ${teacherB.accessToken}`)
      .set('X-Tenant-Slug', 'correction-iso-b')
      .expect(200);

    expect(listB).toHaveLength(0);
  });
});

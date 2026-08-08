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

describe('School Task Captures & Student Grades E2E', () => {
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

  describe('School task captures', () => {
    it('aluno confirma captura e vê na própria lista', async () => {
      const slug = 'captures-basic';
      const { studentToken } = await setup(slug);

      const { body: capture } = await request(app.getHttpServer())
        .post('/tasks/school-captures/confirm')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ imageUrl: '/uploads/fake.jpg', subject: 'Matemática', title: 'Página 45' })
        .expect(201);

      expect(capture.title).toBe('Página 45');

      const { body: list } = await request(app.getHttpServer())
        .get('/tasks/school-captures/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      expect(list).toHaveLength(1);
    });

    it('professor vê a captura confirmada pelo aluno', async () => {
      const slug = 'captures-teacher-view';
      const { studentToken, teacherToken } = await setup(slug);

      await request(app.getHttpServer())
        .post('/tasks/school-captures/confirm')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ imageUrl: '/uploads/fake.jpg', title: 'Exercícios de história' })
        .expect(201);

      const { body: list } = await request(app.getHttpServer())
        .get('/tasks/school-captures')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      expect(list).toHaveLength(1);
      expect(list[0].title).toBe('Exercícios de história');
    });

    it('isolamento: captura do tenant A não aparece no tenant B', async () => {
      const { studentToken: studentA } = await setup('captures-iso-a');

      await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: 'captures-iso-b', name: 'Escola B' });
      const { body: teacherB } = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('X-Tenant-Slug', 'captures-iso-b')
        .send({ name: 'Professor B', email: 'profb@test.com', password: 'senha1234', role: 'teacher' });

      await request(app.getHttpServer())
        .post('/tasks/school-captures/confirm')
        .set('Authorization', `Bearer ${studentA}`)
        .set('X-Tenant-Slug', 'captures-iso-a')
        .send({ imageUrl: '/uploads/fake.jpg', title: 'Segredo do tenant A' })
        .expect(201);

      const { body: listB } = await request(app.getHttpServer())
        .get('/tasks/school-captures')
        .set('Authorization', `Bearer ${teacherB.accessToken}`)
        .set('X-Tenant-Slug', 'captures-iso-b')
        .expect(200);

      expect(listB).toHaveLength(0);
    });
  });

  describe('Student grades (notas da escola)', () => {
    it('professor registra nota e admin vê na lista', async () => {
      const slug = 'grades-basic';
      const { teacherToken, adminToken, studentId } = await setup(slug);

      const { body: grade } = await request(app.getHttpServer())
        .post('/progress/grades')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ studentId, subject: 'Português', unidade: '1ª Unidade', value: 9.5 })
        .expect(201);

      expect(Number(grade.value)).toBe(9.5);

      const { body: list } = await request(app.getHttpServer())
        .get(`/progress/grades/student/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      expect(list).toHaveLength(1);
    });

    it('aluno não pode registrar nota (403)', async () => {
      const slug = 'grades-forbidden';
      const { studentToken, studentId } = await setup(slug);

      await request(app.getHttpServer())
        .post('/progress/grades')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ studentId, subject: 'Português', unidade: '1ª Unidade', value: 9.5 })
        .expect(403);
    });

    it('admin exclui nota', async () => {
      const slug = 'grades-delete';
      const { adminToken, studentId } = await setup(slug);

      const { body: grade } = await request(app.getHttpServer())
        .post('/progress/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .send({ studentId, subject: 'Ciências', unidade: '2ª Unidade', value: 7 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/progress/grades/${grade.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(204);

      const { body: list } = await request(app.getHttpServer())
        .get(`/progress/grades/student/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', slug)
        .expect(200);

      expect(list).toHaveLength(0);
    });

    it('isolamento: tenant B não vê nota lançada para um aluno do tenant A', async () => {
      const { teacherToken: teacherA, studentId: studentIdA } = await setup('grades-iso-a');

      await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: 'grades-iso-b', name: 'Escola B' });
      const { body: adminB } = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('X-Tenant-Slug', 'grades-iso-b')
        .send({ name: 'Admin B', email: 'adminb@test.com', password: 'senha1234', role: 'tenant_admin' });

      await request(app.getHttpServer())
        .post('/progress/grades')
        .set('Authorization', `Bearer ${teacherA}`)
        .set('X-Tenant-Slug', 'grades-iso-a')
        .send({ studentId: studentIdA, subject: 'Nota secreta', unidade: '1ª Unidade', value: 10 })
        .expect(201);

      const { body: crossLookup } = await request(app.getHttpServer())
        .get(`/progress/grades/student/${studentIdA}`)
        .set('Authorization', `Bearer ${adminB.accessToken}`)
        .set('X-Tenant-Slug', 'grades-iso-b')
        .expect(200);

      expect(crossLookup).toHaveLength(0);
    });
  });
});

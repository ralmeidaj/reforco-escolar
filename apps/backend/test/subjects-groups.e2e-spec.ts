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

describe('Subjects, Groups & Enrollments E2E', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;
  let tenantSlug: string;
  let teacherId: string;
  let studentId: string;
  let guardianId: string;

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

    const { body: guardian } = await request(app.getHttpServer())
      .post('/auth/signup')
      .set('X-Tenant-Slug', slug)
      .send({ name: 'Responsável Ana', email: 'ana@test.com', password: 'senha1234', role: 'guardian' })
      .expect(201);

    return {
      adminToken: admin.accessToken,
      teacherId: teacher.user.id,
      studentId: student.user.id,
      guardianId: guardian.user.id,
    };
  }

  describe('Subjects CRUD', () => {
    it('admin cria, lista, atualiza e remove uma disciplina', async () => {
      tenantSlug = 'spec2-subjects';
      const { adminToken } = await setup(tenantSlug);

      // Criar
      const { body: created } = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ name: 'Matemática', color: '#3B82F6', icon: 'calculator' })
        .expect(201);

      expect(created.name).toBe('Matemática');
      expect(created.tenantId).toBeDefined();

      // Listar
      const { body: list } = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenantSlug)
        .expect(200);

      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Matemática');

      // Atualizar
      await request(app.getHttpServer())
        .patch(`/subjects/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ name: 'Matemática Avançada' })
        .expect(200);

      // Remover
      await request(app.getHttpServer())
        .delete(`/subjects/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenantSlug)
        .expect(204);

      const { body: empty } = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenantSlug)
        .expect(200);

      expect(empty).toHaveLength(0);
    });
  });

  describe('Groups CRUD', () => {
    it('admin cria e remove uma turma', async () => {
      tenantSlug = 'spec2-groups';
      const { adminToken } = await setup(tenantSlug);

      const { body: group } = await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ name: '5º Ano A', level: 'fundamental' })
        .expect(201);

      expect(group.name).toBe('5º Ano A');
      expect(group.level).toBe('fundamental');

      await request(app.getHttpServer())
        .delete(`/groups/${group.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Slug', tenantSlug)
        .expect(204);
    });
  });

  describe('Teacher ↔ Subject link', () => {
    it('admin vincula professor a disciplina e lista vínculo', async () => {
      tenantSlug = 'spec2-teacher-subject';
      const ids = await setup(tenantSlug);
      token = ids.adminToken;
      teacherId = ids.teacherId;

      const { body: subject } = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ name: 'Física', color: '#8B5CF6' })
        .expect(201);

      const { body: link } = await request(app.getHttpServer())
        .post('/teacher-subjects')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ teacherId, subjectId: subject.id })
        .expect(201);

      expect(link.teacherId).toBe(teacherId);

      // Duplicata deve retornar 409
      await request(app.getHttpServer())
        .post('/teacher-subjects')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ teacherId, subjectId: subject.id })
        .expect(409);

      // Remover vínculo
      await request(app.getHttpServer())
        .delete(`/teacher-subjects/${link.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', tenantSlug)
        .expect(204);
    });
  });

  describe('Student Enrollment', () => {
    it('admin matricula aluno e rejeita duplicata', async () => {
      tenantSlug = 'spec2-enrollment';
      const ids = await setup(tenantSlug);
      token = ids.adminToken;
      studentId = ids.studentId;

      const { body: subject } = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ name: 'Química', color: '#10B981' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ studentId, subjectId: subject.id })
        .expect(201);

      // Duplicata
      await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ studentId, subjectId: subject.id })
        .expect(409);
    });
  });

  describe('Guardian ↔ Student link', () => {
    it('admin vincula responsável a aluno e rejeita duplicata', async () => {
      tenantSlug = 'spec2-guardian';
      const ids = await setup(tenantSlug);
      token = ids.adminToken;
      studentId = ids.studentId;
      guardianId = ids.guardianId;

      await request(app.getHttpServer())
        .post('/guardian-students')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ guardianId, studentId })
        .expect(201);

      await request(app.getHttpServer())
        .post('/guardian-students')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Slug', tenantSlug)
        .send({ guardianId, studentId })
        .expect(409);
    });
  });

  describe('Isolamento de tenant — Spec 2', () => {
    it('disciplina criada no tenant A não aparece no tenant B', async () => {
      const { adminToken: tokenA } = await setup('spec2-iso-a');

      await request(app.getHttpServer())
        .post('/tenants')
        .send({ slug: 'spec2-iso-b', name: 'Escola B' });
      const { body: adminB } = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('X-Tenant-Slug', 'spec2-iso-b')
        .send({ name: 'Admin B', email: 'adminb@test.com', password: 'senha1234', role: 'tenant_admin' });

      await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('X-Tenant-Slug', 'spec2-iso-a')
        .send({ name: 'Disciplina Secreta' })
        .expect(201);

      const { body: listB } = await request(app.getHttpServer())
        .get('/subjects')
        .set('Authorization', `Bearer ${adminB.accessToken}`)
        .set('X-Tenant-Slug', 'spec2-iso-b')
        .expect(200);

      expect(listB).toHaveLength(0);
    });
  });
});

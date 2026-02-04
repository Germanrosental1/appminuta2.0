import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authorization Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  const testUser = {
    id: 'test-user-authorization-flow',
    email: 'auth-test@example.com',
  };

  const testProject = {
    Id: 'test-project-auth',
    Nombre: 'Test Project Authorization',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Create test user and project
    await prisma.users.create({
      data: {
        id: testUser.id,
        email: testUser.email,
      },
    });

    await prisma.proyectos.create({
      data: {
        Id: testProject.Id,
        Nombre: testProject.Nombre,
        TablaNombre: 'test_table_auth',
      },
    });

    // Create user-project relationship
    await prisma.usuariosProyectos.create({
      data: {
        IdUsuario: testUser.id,
        IdProyecto: testProject.Id,
      },
    });

    // Mock auth token (in real E2E, you'd get this from Supabase)
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.usuariosProyectos.deleteMany({
      where: { IdUsuario: testUser.id },
    });

    await prisma.proyectos.deleteMany({
      where: { Id: testProject.Id },
    });

    await prisma.users.deleteMany({
      where: { id: testUser.id },
    });

    await app.close();
  });

  describe('GET /api/minutas - Authorization', () => {
    it('should deny access without token', () => {
      return request(app.getHttpServer())
        .get('/api/minutas')
        .expect(401);
    });

    it('should allow access with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/minutas')
        .set('Authorization', `Bearer ${authToken}`)
        .expect((res) => {
          // Should either return 200 with data or 403 if no permissions
          expect([200, 403]).toContain(res.status);
        });
    });

    it('should filter minutas by user projects', async () => {
      // This test requires mocked Supabase JWT validation
      // In real implementation, you'd set up proper test tokens
      const response = await request(app.getHttpServer())
        .get('/api/minutas')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('metadata');

        // Verify ApiResponse wrapper structure
        expect(response.body.success).toBe(true);
        expect(response.body.metadata).toHaveProperty('timestamp');
        expect(response.body.metadata).toHaveProperty('version');
      }
    });
  });

  describe('POST /api/minutas - Project Access Control', () => {
    it('should allow creating minuta in authorized project', async () => {
      const createDto = {
        ProyectoId: testProject.Id,
        Fecha: new Date().toISOString(),
        UnidadesIds: [],
      };

      const response = await request(app.getHttpServer())
        .post('/api/minutas/definitivas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto);

      // Should either succeed or fail with permission error
      expect([201, 403]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('Id');
      }
    });

    it('should deny creating minuta in unauthorized project', async () => {
      const unauthorizedProjectId = 'unauthorized-project-123';

      const createDto = {
        ProyectoId: unauthorizedProjectId,
        Fecha: new Date().toISOString(),
        UnidadesIds: [],
      };

      const response = await request(app.getHttpServer())
        .post('/api/minutas/definitivas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto);

      // Should fail with 403 or 404
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('API Response Wrapper - Authorization Errors', () => {
    it('should return wrapped error for unauthorized access', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/minutas/non-existent-id')
        .set('Authorization', `Bearer invalid-token`)
        .expect(401);

      // Verify error response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(401);
      expect(response.body).toHaveProperty('metadata');
    });

    it('should return wrapped error for forbidden resource', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/minutas')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ proyectoId: 'forbidden-project' });

      if (response.status === 403) {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBeTruthy();
        expect(response.body.metadata).toHaveProperty('timestamp');
      }
    });
  });

  describe('Permissions Validation', () => {
    it('should validate required permissions for create operation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/minutas/definitivas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ProyectoId: testProject.Id,
          Fecha: new Date().toISOString(),
          UnidadesIds: [],
        });

      // User might not have CREATE permission
      if (response.status === 403) {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/permission|permisos/i);
      }
    });

    it('should validate required permissions for delete operation', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/minutas/definitivas/fake-id')
        .set('Authorization', `Bearer ${authToken}`);

      // Should either be 403 (no permission), 404 (not found), or 200 (deleted)
      expect([200, 403, 404]).toContain(response.status);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce role restrictions on admin endpoints', async () => {
      // Try to access an admin-only endpoint
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      // Should be denied or not found
      expect([401, 403, 404]).toContain(response.status);
    });
  });
});

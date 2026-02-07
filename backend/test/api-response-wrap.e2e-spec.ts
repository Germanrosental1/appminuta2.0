import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SupabaseAuthGuard } from '../src/common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../src/common/guards/global-permissions.guard';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { MinutasService } from '../src/minutas/minutas.service';

describe('API Response Wrapping (E2E)', () => {
    let app: INestApplication;

    // Mock guards to bypass Auth
    const mockAuthGuard = {
        canActivate: (context: any) => {
            const req = context.switchToHttp().getRequest();
            req.user = { id: 'test-user-id', role: 'admin' };
            return true;
        }
    };
    const mockPermissionsGuard = { canActivate: () => true };

    // Mock PrismaService
    const mockPrismaService = {
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    // Mock MinutasService
    const mockMinutasService = {
        findAll: jest.fn().mockResolvedValue([]),
        getPermissionsCacheStats: jest.fn().mockResolvedValue({ backend: 'memory', ttlSeconds: 3600 }),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(SupabaseAuthGuard)
            .useValue(mockAuthGuard)
            .overrideGuard(GlobalPermissionsGuard)
            .useValue(mockPermissionsGuard)
            .overrideProvider(PrismaService)
            .useValue(mockPrismaService)
            .overrideProvider(MinutasService)
            .useValue(mockMinutasService)
            .compile();

        app = moduleFixture.createNestApplication();

        // El interceptor se registra globalmente en main.ts, pero en tests E2E 
        // debemos asegurarnos que esté presente si no usamos el main.ts bootstrap.
        // AppModule ya lo tiene si se usa provide: APP_INTERCEPTOR, pero aquí se usa manualmente en main.ts.
        // Usamos el interceptor y el filtro explícitamente para el test.
        app.useGlobalInterceptors(new ApiResponseInterceptor());
        app.useGlobalFilters(new AllExceptionsFilter());

        await app.init();
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    it('GET /minutas should return wrapped ApiResponse', async () => {
        const response = await request(app.getHttpServer())
            .get('/minutas')
            .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('metadata');
        expect(response.body.metadata).toHaveProperty('timestamp');
        expect(response.body.metadata).toHaveProperty('path', '/minutas');
        expect(response.body.metadata).toHaveProperty('method', 'GET');
    });

    it('GET /health should return wrapped response (from AppController)', async () => {
        const response = await request(app.getHttpServer())
            .get('/health')
            .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.metadata.path).toBe('/health');
    });

    it('Non-existent route should return wrapped error (via AllExceptionsFilter and interceptor)', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/invalid-route-123')
            .expect(404);

        // Los errores son wrapeados por el AllExceptionsFilter con ApiErrorResponse
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 404);
        expect(response.body).toHaveProperty('metadata');
    });
});

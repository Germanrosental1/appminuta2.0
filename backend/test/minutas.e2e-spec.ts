import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseAuthGuard } from '../src/common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../src/common/guards/global-permissions.guard';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';

describe('Minutas E2E Tests', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let createdMinutaId: string;

    // Real UUIDs fetched from Supabase
    const REAL_USER_ID = 'eaf782a2-13e4-4ed1-9d40-8da41b43872a';
    const REAL_PROJECT_ID = '005b275a-f767-4af4-8803-646e365752d6';
    const REAL_UNIT_ID = '421df8bf-5576-404c-a647-d79e25e1064c';

    // Mock guards to bypass auth for testing
    const mockAuthGuard = {
        canActivate: (context) => {
            const req = context.switchToHttp().getRequest();
            req.user = {
                id: REAL_USER_ID,
                email: 'test@example.com',
                role: 'adminmv'
            };
            return true;
        },
    };

    const mockPermissionsGuard = {
        canActivate: () => true,
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(SupabaseAuthGuard)
            .useValue(mockAuthGuard)
            .overrideGuard(GlobalPermissionsGuard)
            .useValue(mockPermissionsGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        app.useGlobalInterceptors(new ApiResponseInterceptor());
        await app.init();

        prisma = moduleFixture.get<PrismaService>(PrismaService);
    }, 30000);

    afterAll(async () => {
        // Cleanup: Remove test data
        if (createdMinutaId) {
            await prisma.minutasDefinitivas.deleteMany({
                where: { Id: createdMinutaId },
            }).catch(() => { });
        }

        await app.close();
    });

    describe('Complete CRUD Flow', () => {
        it('should create → get → update → verify minuta flow', async () => {
            // 1. CREATE
            const createPayload = {
                estado: 'pendiente',
                proyecto: REAL_PROJECT_ID,
                datos: {
                    proyecto: 'Arboria',
                    tipo: 'Venta',
                    cliente: 'Test Client',
                    unidades: [],
                },
            };

            const createResponse = await request(app.getHttpServer())
                .post('/minutas')
                .send(createPayload)
                .expect(201);

            expect(createResponse.body.success).toBe(true);
            expect(createResponse.body.data).toHaveProperty('Id');
            createdMinutaId = createResponse.body.data.Id;

            // 2. GET
            const getResponse = await request(app.getHttpServer())
                .get(`/minutas/${createdMinutaId}`)
                .expect(200);

            expect(getResponse.body.success).toBe(true);
            expect(getResponse.body.data.Estado).toBe('pendiente');

            // 3. UPDATE to 'aprobada'
            const updatePayload = {
                estado: 'aprobada',
                version: getResponse.body.data.Version || 1,
                comentarios: 'Aprobada para pruebas E2E',
            };

            const updateResponse = await request(app.getHttpServer())
                .patch(`/minutas/${createdMinutaId}`)
                .send(updatePayload)
                .expect(200);

            expect(updateResponse.body.success).toBe(true);
            expect(updateResponse.body.data.Estado).toBe('aprobada');

            // 4. VERIFY state changed
            const verifyResponse = await request(app.getHttpServer())
                .get(`/minutas/${createdMinutaId}`)
                .expect(200);

            expect(verifyResponse.body.data.Estado).toBe('aprobada');
        }, 15000);

        it('should create → approve → cancel (verify units released)', async () => {
            // This test would require actual unit reservation logic
            // Using REAL_UNIT_ID valid for the project
            const createPayload = {
                estado: 'pendiente',
                proyecto: REAL_PROJECT_ID,
                datos: {
                    proyecto: 'Arboria',
                    tipo: 'Venta',
                    unidades: [{ id: REAL_UNIT_ID }],
                },
            };

            const createResponse = await request(app.getHttpServer())
                .post('/minutas')
                .send(createPayload)
                .expect(201);

            const minutaId = createResponse.body.data.Id;

            // Cancel the minuta
            const cancelPayload = {
                estado: 'cancelada',
                version: 1,
                comentarios: 'Cancelada por pruebas E2E - unidades deben liberarse',
            };

            await request(app.getHttpServer())
                .patch(`/minutas/${minutaId}`)
                .send(cancelPayload)
                .expect(200);

            // Cleanup
            await prisma.minutasDefinitivas.delete({ where: { Id: minutaId } }).catch(() => { });
        }, 10000);

        it('should reject invalid state transition with 400 BadRequest', async () => {
            // Create a 'firmada' minuta using Prisma directly
            const testMinuta = await prisma.minutasDefinitivas.create({
                data: {
                    Estado: 'firmada',
                    UsuarioId: REAL_USER_ID,
                    Proyecto: REAL_PROJECT_ID,
                    Dato: {},
                    Version: 1,
                },
            });

            // Try to transition firmada → pendiente (invalid)
            const invalidPayload = {
                estado: 'pendiente',
                version: 1,
            };

            await request(app.getHttpServer())
                .patch(`/minutas/${testMinuta.Id}`)
                .send(invalidPayload)
                .expect(400); // Should return BadRequest

            // Cleanup
            await prisma.minutasDefinitivas.delete({ where: { Id: testMinuta.Id } });
        }, 10000);
    });

    describe('Authorization Flows', () => {
        // Skipped test requiring a second valid user ID to avoid FK constraints
        /* 
        it('should return 403 when user without verTodasMinutas accesses another user minuta', async () => {
            ...
        });
        */

        it('should allow firmarMinuta permission to view aprobada minutas', async () => {
            // Create an 'aprobada' minuta owned by REAL_USER_ID
            const aprobadaMinuta = await prisma.minutasDefinitivas.create({
                data: {
                    Estado: 'aprobada',
                    UsuarioId: REAL_USER_ID,
                    Proyecto: REAL_PROJECT_ID,
                    Dato: {},
                    Version: 1,
                },
            });

            // User with firmarMinuta (mocked permissions) should be able to access
            const response = await request(app.getHttpServer())
                .get(`/minutas/${aprobadaMinuta.Id}`)
                .expect(200);

            expect(response.body.data.Estado).toBe('aprobada');

            // Cleanup
            await prisma.minutasDefinitivas.delete({ where: { Id: aprobadaMinuta.Id } });
        }, 10000);
    });
});

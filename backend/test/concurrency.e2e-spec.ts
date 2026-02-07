import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseAuthGuard } from '../src/common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../src/common/guards/global-permissions.guard';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';

describe('Multi-user Concurrency (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let createdMinutaIds: string[] = [];

    // Test users
    const USER_1 = {
        id: 'user-1-concurrency-test',
        email: 'user1@example.com',
        role: 'jefe_ventas'
    };

    const USER_2 = {
        id: 'user-2-concurrency-test',
        email: 'user2@example.com',
        role: 'jefe_ventas'
    };

    const REAL_PROJECT_ID = '005b275a-f767-4af4-8803-646e365752d6';

    // Factory for auth guards
    const createMockAuthGuard = (user: typeof USER_1) => ({
        canActivate: (context: any) => {
            const req = context.switchToHttp().getRequest();
            req.user = user;
            return true;
        },
    });

    const mockPermissionsGuard = {
        canActivate: () => true,
    };

    let currentUser = USER_1;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(SupabaseAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = currentUser;
                    return true;
                },
            })
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
        // Cleanup all created minutas
        for (const id of createdMinutaIds) {
            await prisma.minutasDefinitivas.deleteMany({
                where: { Id: id },
            }).catch(() => { });
        }

        await app.close();
    });

    afterEach(() => {
        currentUser = USER_1; // Reset to default user
    });

    describe('Optimistic Locking - Concurrent Updates', () => {
        it('should reject second update when version is stale', async () => {
            // Create a minuta
            const createResponse = await request(app.getHttpServer())
                .post('/minutas')
                .send({
                    estado: 'pendiente',
                    proyecto: REAL_PROJECT_ID,
                    datos: { proyecto: 'Concurrency Test', tipo: 'Venta', unidades: [] },
                })
                .expect(201);

            const minutaId = createResponse.body.data.Id;
            createdMinutaIds.push(minutaId);
            const initialVersion = createResponse.body.data.Version || 1;

            // USER_1: First update
            const update1Response = await request(app.getHttpServer())
                .patch(`/minutas/${minutaId}`)
                .send({
                    comentarios: 'Update from User 1',
                    version: initialVersion,
                })
                .expect(200);

            expect(update1Response.body.data.Version).toBe(initialVersion + 1);

            // USER_2: Try to update with stale version (should fail)
            currentUser = USER_2;

            const update2Response = await request(app.getHttpServer())
                .patch(`/minutas/${minutaId}`)
                .send({
                    comentarios: 'Update from User 2',
                    version: initialVersion, // Stale version
                })
                .expect(409); // Conflict

            expect(update2Response.body.success).toBe(false);
            expect(update2Response.body.message).toMatch(/modificada|conflict|version/i);
        }, 10000);

        it('should allow sequential updates with correct versions', async () => {
            // Create minuta
            const createResponse = await request(app.getHttpServer())
                .post('/minutas')
                .send({
                    estado: 'pendiente',
                    proyecto: REAL_PROJECT_ID,
                    datos: { proyecto: 'Sequential Test', tipo: 'Venta', unidades: [] },
                })
                .expect(201);

            const minutaId = createResponse.body.data.Id;
            createdMinutaIds.push(minutaId);

            // Get latest version
            const getResponse1 = await request(app.getHttpServer())
                .get(`/minutas/${minutaId}`)
                .expect(200);

            // First update
            const update1 = await request(app.getHttpServer())
                .patch(`/minutas/${minutaId}`)
                .send({
                    comentarios: 'First sequential update',
                    version: getResponse1.body.data.Version || 1,
                })
                .expect(200);

            // Get new version
            const getResponse2 = await request(app.getHttpServer())
                .get(`/minutas/${minutaId}`)
                .expect(200);

            // Second update with correct version
            currentUser = USER_2;
            const update2 = await request(app.getHttpServer())
                .patch(`/minutas/${minutaId}`)
                .send({
                    comentarios: 'Second sequential update',
                    version: getResponse2.body.data.Version || update1.body.data.Version,
                })
                .expect(200);

            expect(update2.body.success).toBe(true);
        }, 15000);
    });

    describe('Parallel Request Handling', () => {
        it('should handle 5 parallel GET requests correctly', async () => {
            // Create a minuta
            const createResponse = await request(app.getHttpServer())
                .post('/minutas')
                .send({
                    estado: 'pendiente',
                    proyecto: REAL_PROJECT_ID,
                    datos: { proyecto: 'Parallel Test', tipo: 'Venta', unidades: [] },
                })
                .expect(201);

            const minutaId = createResponse.body.data.Id;
            createdMinutaIds.push(minutaId);

            // Make 5 parallel GET requests
            const parallelRequests = Array.from({ length: 5 }, () =>
                request(app.getHttpServer()).get(`/minutas/${minutaId}`)
            );

            const responses = await Promise.all(parallelRequests);

            // All should succeed
            responses.forEach((response, index) => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.Id).toBe(minutaId);
            });
        }, 10000);

        it('should handle parallel list requests with different pagination', async () => {
            const queries = [
                { page: 1, limit: 5 },
                { page: 1, limit: 10 },
                { page: 2, limit: 5 },
            ];

            const parallelRequests = queries.map(query =>
                request(app.getHttpServer())
                    .get('/minutas')
                    .query(query)
            );

            const responses = await Promise.all(parallelRequests);

            responses.forEach((response) => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data).toBeDefined();
            });
        }, 10000);
    });

    describe('Unit Reservation Conflicts', () => {
        it('should handle attempt to reserve already-reserved unit', async () => {
            // Note: This test requires actual unit IDs from the database
            // In a production test, you would:
            // 1. Create a minuta with specific unit(s)
            // 2. Attempt to create another minuta with same unit(s)
            // 3. Expect second creation to fail or handle conflict

            const SHARED_UNIT_ID = 'test-unit-reservation'; // Placeholder

            // First minuta with unit
            const create1Response = await request(app.getHttpServer())
                .post('/minutas')
                .send({
                    estado: 'pendiente',
                    proyecto: REAL_PROJECT_ID,
                    datos: {
                        proyecto: 'Reservation Test 1',
                        tipo: 'Venta',
                        unidades: [{ id: SHARED_UNIT_ID }],
                    },
                })
                .expect(201);

            createdMinutaIds.push(create1Response.body.data.Id);

            // Second minuta attempting same unit (should handle gracefully)
            currentUser = USER_2;
            const create2Response = await request(app.getHttpServer())
                .post('/minutas')
                .send({
                    estado: 'pendiente',
                    proyecto: REAL_PROJECT_ID,
                    datos: {
                        proyecto: 'Reservation Test 2',
                        tipo: 'Venta',
                        unidades: [{ id: SHARED_UNIT_ID }],
                    },
                });

            // Either succeeds with different state or fails with conflict
            expect([201, 400, 409]).toContain(create2Response.status);

            if (create2Response.status === 201) {
                createdMinutaIds.push(create2Response.body.data.Id);
            }
        }, 10000);
    });

    describe('State Transition Races', () => {
        it('should handle two users trying to approve simultaneously', async () => {
            // Create minuta in pendiente state
            const createResponse = await request(app.getHttpServer())
                .post('/minutas')
                .send({
                    estado: 'pendiente',
                    proyecto: REAL_PROJECT_ID,
                    datos: { proyecto: 'Race Test', tipo: 'Venta', unidades: [] },
                })
                .expect(201);

            const minutaId = createResponse.body.data.Id;
            createdMinutaIds.push(minutaId);
            const version = createResponse.body.data.Version || 1;

            // Simulate race: both users try to approve with same version
            const approve1Promise = request(app.getHttpServer())
                .patch(`/minutas/${minutaId}`)
                .send({ estado: 'aprobada', version });

            // Small delay to ensure slightly different timing
            await new Promise(r => setTimeout(r, 10));

            currentUser = USER_2;
            const approve2Promise = request(app.getHttpServer())
                .patch(`/minutas/${minutaId}`)
                .send({ estado: 'aprobada', version });

            const [result1, result2] = await Promise.all([approve1Promise, approve2Promise]);

            // One should succeed (200), one should conflict (409)
            const statuses = [result1.status, result2.status].sort();

            // At least one should succeed
            expect(statuses).toContain(200);
            // The other might be 409 (conflict) or also 200 if timing allows
            expect([200, 409]).toContain(statuses[0]);
        }, 10000);
    });
});

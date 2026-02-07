import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseAuthGuard } from '../src/common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../src/common/guards/global-permissions.guard';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';

describe('WebSocket Real-time Updates (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let socket: Socket;
    let createdMinutaIds: string[] = [];

    // Test constants
    const REAL_USER_ID = 'eaf782a2-13e4-4ed1-9d40-8da41b43872a';
    const REAL_PROJECT_ID = '005b275a-f767-4af4-8803-646e365752d6';

    // Mock guards
    const mockAuthGuard = {
        canActivate: (context: any) => {
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

        // Start listening for WebSocket connections
        await app.listen(0); // Random port for testing
    }, 30000);

    afterAll(async () => {
        // Cleanup created minutas
        for (const id of createdMinutaIds) {
            await prisma.minutasDefinitivas.deleteMany({
                where: { Id: id },
            }).catch(() => { });
        }

        if (socket) {
            socket.disconnect();
        }

        await app.close();
    });

    beforeEach(async () => {
        // Connect to WebSocket
        const address = app.getHttpServer().address();
        const port = typeof address === 'object' ? address?.port : 3000;

        socket = io(`http://localhost:${port}`, {
            transports: ['websocket'],
            auth: {
                token: 'test-token'
            }
        });

        await new Promise<void>((resolve, reject) => {
            socket.on('connect', () => resolve());
            socket.on('connect_error', (err) => reject(err));
            setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        });
    }, 10000);

    afterEach(() => {
        if (socket) {
            socket.disconnect();
        }
    });

    describe('Minuta Creation Events', () => {
        it('should emit minuta:created event when a new minuta is created', async () => {
            // Subscribe to project room
            socket.emit('subscribe', { projectId: REAL_PROJECT_ID });

            // Set up listener for the event
            const eventPromise = new Promise<any>((resolve) => {
                socket.on('minuta:created', (data) => {
                    resolve(data);
                });
            });

            // Create a minuta via REST API
            const createPayload = {
                estado: 'pendiente',
                proyecto: REAL_PROJECT_ID,
                datos: {
                    proyecto: 'Test Project',
                    tipo: 'Venta',
                    unidades: [],
                },
            };

            const response = await request(app.getHttpServer())
                .post('/minutas')
                .send(createPayload)
                .expect(201);

            createdMinutaIds.push(response.body.data.Id);

            // Wait for WebSocket event
            const event = await Promise.race([
                eventPromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Event not received within timeout')), 3000)
                ),
            ]);

            expect(event).toHaveProperty('minutaId');
            expect(event.estado).toBe('pendiente');
        }, 15000);
    });

    describe('State Change Events', () => {
        it('should emit minuta:stateChanged when minuta state transitions', async () => {
            // Create a minuta first
            const createPayload = {
                estado: 'pendiente',
                proyecto: REAL_PROJECT_ID,
                datos: { proyecto: 'Test', tipo: 'Venta', unidades: [] },
            };

            const createResponse = await request(app.getHttpServer())
                .post('/minutas')
                .send(createPayload)
                .expect(201);

            const minutaId = createResponse.body.data.Id;
            createdMinutaIds.push(minutaId);

            // Subscribe to events
            socket.emit('subscribe', { projectId: REAL_PROJECT_ID });

            // Set up listener
            const eventPromise = new Promise<any>((resolve) => {
                socket.on('minuta:stateChanged', (data) => {
                    if (data.minutaId === minutaId) {
                        resolve(data);
                    }
                });
            });

            // Update the minuta state
            const updatePayload = {
                estado: 'aprobada',
                version: createResponse.body.data.Version || 1,
            };

            await request(app.getHttpServer())
                .patch(`/minutas/${minutaId}`)
                .send(updatePayload)
                .expect(200);

            // Wait for WebSocket event
            const event = await Promise.race([
                eventPromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('stateChanged event not received')), 3000)
                ),
            ]);

            expect(event.minutaId).toBe(minutaId);
            expect(event.estado).toBe('aprobada');
        }, 15000);
    });

    describe('Room Subscription', () => {
        it('should only receive events for subscribed projects', async () => {
            const OTHER_PROJECT_ID = 'non-existent-project';

            // Subscribe to a DIFFERENT project
            socket.emit('subscribe', { projectId: OTHER_PROJECT_ID });

            let receivedEvent = false;

            socket.on('minuta:created', () => {
                receivedEvent = true;
            });

            // Create minuta in REAL_PROJECT_ID (not subscribed)
            const createPayload = {
                estado: 'pendiente',
                proyecto: REAL_PROJECT_ID,
                datos: { proyecto: 'Test', tipo: 'Venta', unidades: [] },
            };

            const response = await request(app.getHttpServer())
                .post('/minutas')
                .send(createPayload)
                .expect(201);

            createdMinutaIds.push(response.body.data.Id);

            // Wait a bit to ensure no event is received
            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(receivedEvent).toBe(false);
        }, 10000);

        it('should allow unsubscribing from project rooms', async () => {
            // Subscribe then unsubscribe
            socket.emit('subscribe', { projectId: REAL_PROJECT_ID });
            socket.emit('unsubscribe', { projectId: REAL_PROJECT_ID });

            let receivedEvent = false;

            socket.on('minuta:created', () => {
                receivedEvent = true;
            });

            // Create minuta
            const createPayload = {
                estado: 'pendiente',
                proyecto: REAL_PROJECT_ID,
                datos: { proyecto: 'Test', tipo: 'Venta', unidades: [] },
            };

            const response = await request(app.getHttpServer())
                .post('/minutas')
                .send(createPayload)
                .expect(201);

            createdMinutaIds.push(response.body.data.Id);

            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(receivedEvent).toBe(false);
        }, 10000);
    });

    describe('Concurrent Updates', () => {
        it('should broadcast state changes to multiple connected clients', async () => {
            // Create second socket
            const address = app.getHttpServer().address();
            const port = typeof address === 'object' ? address?.port : 3000;

            const socket2 = io(`http://localhost:${port}`, {
                transports: ['websocket'],
                auth: { token: 'test-token-2' }
            });

            await new Promise<void>((resolve, reject) => {
                socket2.on('connect', () => resolve());
                socket2.on('connect_error', (err) => reject(err));
                setTimeout(() => reject(new Error('Socket2 connection timeout')), 5000);
            });

            try {
                // Both subscribe to same project
                socket.emit('subscribe', { projectId: REAL_PROJECT_ID });
                socket2.emit('subscribe', { projectId: REAL_PROJECT_ID });

                let socket1Received = false;
                let socket2Received = false;

                socket.on('minuta:created', () => { socket1Received = true; });
                socket2.on('minuta:created', () => { socket2Received = true; });

                // Create minuta
                const response = await request(app.getHttpServer())
                    .post('/minutas')
                    .send({
                        estado: 'pendiente',
                        proyecto: REAL_PROJECT_ID,
                        datos: { proyecto: 'Test', tipo: 'Venta', unidades: [] },
                    })
                    .expect(201);

                createdMinutaIds.push(response.body.data.Id);

                // Wait for events
                await new Promise((resolve) => setTimeout(resolve, 1500));

                expect(socket1Received).toBe(true);
                expect(socket2Received).toBe(true);
            } finally {
                socket2.disconnect();
            }
        }, 15000);
    });
});

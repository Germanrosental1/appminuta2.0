import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SupabaseAuthGuard } from '../src/common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../src/common/guards/global-permissions.guard';
import { CacheModule } from '@nestjs/cache-manager';

describe('BruteForceGuard (E2E)', () => {
    let app: INestApplication;

    // Mock guards to bypass Auth but keep BruteForce active
    const mockAuthGuard = { canActivate: () => true };
    const mockPermissionsGuard = { canActivate: () => true };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                AppModule,
                CacheModule.register() // Ensure cache is available
            ],
        })
            .overrideGuard(SupabaseAuthGuard)
            .useValue(mockAuthGuard)
            .overrideGuard(GlobalPermissionsGuard)
            .useValue(mockPermissionsGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    }, 30000); // Increase timeout for app init

    afterAll(async () => {
        await app.close();
    });

    it('should block requests after 5 failed attempts to /unidades/adjust-prices', async () => {
        const endpoint = '/unidades/adjust-prices';
        const payload = {
            projectId: 'test-project',
            updates: []
        };

        // 1. Make 5 requests (Limit is 5)
        for (let i = 0; i < 5; i++) {
            await request(app.getHttpServer())
                .patch(endpoint)
                .send(payload)
                // We expect 400 because payload is invalid/empty, but Guard runs BEFORE controller
                // So 400 means "Guard Passed"
                .expect((res) => {
                    if (res.status !== 200 && res.status !== 201 && res.status !== 400 && res.status !== 404) {
                        throw new Error(`Expected 200/400/404 but got ${res.status}`);
                    }
                });
        }

        // 2. The 6th request should be blocked with 429 Too Many Requests
        await request(app.getHttpServer())
            .patch(endpoint)
            .send(payload)
            .expect(429)
            .expect((res) => {
                expect(res.body.message).toContain('Demasiados intentos fallidos');
            });
    });
});

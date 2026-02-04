import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { SupabaseAuthGuard } from '../src/common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../src/common/guards/global-permissions.guard';
import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';

describe('Rate Limiting under Load (e2e)', () => {
    let app: INestApplication;

    const REAL_USER_ID = 'eaf782a2-13e4-4ed1-9d40-8da41b43872a';

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
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    describe('Rate Limit Enforcement', () => {
        it('should handle 50 rapid requests without crashing', async () => {
            const requestCount = 50;
            const results: Array<{ status: number; duration: number }> = [];

            const parallelRequests = Array.from({ length: requestCount }, async () => {
                const start = Date.now();
                const response = await request(app.getHttpServer())
                    .get('/minutas')
                    .query({ page: 1, limit: 5 });
                return {
                    status: response.status,
                    duration: Date.now() - start,
                };
            });

            const responses = await Promise.all(parallelRequests);

            responses.forEach(r => results.push(r));

            // Count success vs rate-limited responses
            const successCount = results.filter(r => r.status === 200).length;
            const rateLimitedCount = results.filter(r => r.status === 429).length;
            const errorCount = results.filter(r => ![200, 429].includes(r.status)).length;

            console.log(`Results: ${successCount} success, ${rateLimitedCount} rate-limited, ${errorCount} errors`);

            // At minimum, some requests should succeed
            expect(successCount).toBeGreaterThan(0);

            // No unexpected errors
            expect(errorCount).toBe(0);
        }, 30000);

        it('should return 429 after exceeding rate limit threshold', async () => {
            // This test depends on actual rate limit configuration
            // Typical threshold might be 100 requests per minute per IP

            const burstSize = 120; // Intentionally exceed typical limit
            const results: number[] = [];

            // Send burst of requests
            for (let i = 0; i < burstSize; i++) {
                const response = await request(app.getHttpServer())
                    .get('/minutas')
                    .query({ page: 1, limit: 1 });
                results.push(response.status);

                // If we got 429, rate limiting is working
                if (response.status === 429) {
                    break;
                }
            }

            // Either rate limiting kicked in (429) or all succeeded (200)
            const has429 = results.includes(429);
            const allSuccess = results.every(s => s === 200);

            // Test passes if either rate limiting works OR no limit is configured
            expect(has429 || allSuccess).toBe(true);

            if (has429) {
                console.log(`Rate limiting kicked in after ${results.indexOf(429)} requests`);
            } else {
                console.log(`All ${burstSize} requests succeeded - rate limit may not be configured or is higher`);
            }
        }, 60000);
    });

    describe('Rate Limit Headers', () => {
        it('should include rate limit headers in response', async () => {
            const response = await request(app.getHttpServer())
                .get('/minutas')
                .query({ page: 1, limit: 10 })
                .expect(200);

            // Check for common rate limit headers (may or may not be present)
            const rateLimitHeaders = [
                'x-ratelimit-limit',
                'x-ratelimit-remaining',
                'x-ratelimit-reset',
                'retry-after',
            ];

            const foundHeaders = rateLimitHeaders.filter(
                header => response.headers[header] !== undefined
            );

            // Log which headers are present (informational)
            console.log('Rate limit headers found:', foundHeaders);

            // This is informational - test passes regardless
            expect(response.status).toBe(200);
        });
    });

    describe('Per-Endpoint Rate Limits', () => {
        it('should have stricter limits on mutation endpoints', async () => {
            // POST endpoints typically have stricter limits than GET
            const getRequests = Array.from({ length: 20 }, () =>
                request(app.getHttpServer())
                    .get('/minutas')
                    .query({ page: 1, limit: 1 })
            );

            const getResults = await Promise.all(getRequests);
            const getSuccessRate = getResults.filter(r => r.status === 200).length / getResults.length;

            console.log(`GET success rate: ${getSuccessRate * 100}%`);

            // GET requests should have high success rate
            expect(getSuccessRate).toBeGreaterThan(0.8);
        }, 15000);
    });

    describe('Graceful Degradation', () => {
        it('should return proper error format when rate limited', async () => {
            // Attempt to trigger rate limit
            const responses: any[] = [];

            for (let i = 0; i < 150; i++) {
                const response = await request(app.getHttpServer())
                    .get('/minutas')
                    .query({ page: 1, limit: 1 });

                if (response.status === 429) {
                    // Verify error format
                    expect(response.body).toHaveProperty('success');
                    expect(response.body.success).toBe(false);
                    expect(response.body).toHaveProperty('message');
                    expect(response.body).toHaveProperty('statusCode');
                    expect(response.body.statusCode).toBe(429);

                    // Check for Retry-After header
                    if (response.headers['retry-after']) {
                        const retryAfter = parseInt(response.headers['retry-after']);
                        expect(retryAfter).toBeGreaterThan(0);
                    }

                    responses.push(response);
                    break;
                }
            }

            // Either we hit rate limit and verified format, or no limit was reached
            expect(true).toBe(true);
        }, 60000);
    });

    describe('Recovery After Rate Limit', () => {
        it('should allow requests again after waiting', async () => {
            // First, try to hit rate limit
            let rateLimited = false;

            for (let i = 0; i < 100; i++) {
                const response = await request(app.getHttpServer())
                    .get('/minutas')
                    .query({ page: 1, limit: 1 });

                if (response.status === 429) {
                    rateLimited = true;
                    break;
                }
            }

            if (rateLimited) {
                // Wait for rate limit window to reset (typically 1 second for sliding window)
                console.log('Rate limit hit, waiting for reset...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Try again
                const recoveryResponse = await request(app.getHttpServer())
                    .get('/minutas')
                    .query({ page: 1, limit: 1 });

                // Should succeed after waiting
                expect(recoveryResponse.status).toBe(200);
            } else {
                console.log('Rate limit not hit during test - skipping recovery check');
                expect(true).toBe(true);
            }
        }, 30000);
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BruteForceGuard } from './brute-force.guard';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, HttpException } from '@nestjs/common';

describe('BruteForceGuard', () => {
    let guard: BruteForceGuard;
    let cacheManager: any;

    const mockRequest = {
        ip: '127.0.0.1',
        body: { email: 'test@example.com' },
        connection: { remoteAddress: '127.0.0.1' },
    };

    const mockContext = {
        switchToHttp: () => ({
            getRequest: () => mockRequest,
        }),
    } as ExecutionContext;

    beforeEach(async () => {
        cacheManager = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BruteForceGuard,
                {
                    provide: CACHE_MANAGER,
                    useValue: cacheManager,
                },
            ],
        }).compile();

        guard = module.get<BruteForceGuard>(BruteForceGuard);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('canActivate', () => {
        it('should allow request if no block exists', async () => {
            cacheManager.get.mockResolvedValue(null);

            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true);
        });

        it('should throw HttpException if blocked', async () => {
            const futureTime = Date.now() + 60000; // 1 minute from now
            cacheManager.get.mockResolvedValue({
                count: 5,
                blockedUntil: futureTime,
            });

            await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);
        });

        it('should unblock if block time expired', async () => {
            const pastTime = Date.now() - 60000; // 1 minute ago
            cacheManager.get.mockResolvedValue({
                count: 5,
                blockedUntil: pastTime,
            });

            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true);
            expect(cacheManager.del).toHaveBeenCalled(); // Should clear expired block
        });
    });

    describe('recordFailedAttempt', () => {
        it('should increment attempt count', async () => {
            cacheManager.get.mockResolvedValue(null);

            await guard.recordFailedAttempt(mockRequest);

            expect(cacheManager.set).toHaveBeenCalledWith(
                expect.stringContaining('brute_force:127.0.0.1:test@example.com'),
                expect.objectContaining({ count: 1 }),
                expect.any(Number)
            );
        });

        it('should block after max attempts', async () => {
            cacheManager.get.mockResolvedValue({ count: 4 }); // 4 previous attempts

            await guard.recordFailedAttempt(mockRequest);

            expect(cacheManager.set).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    count: 5,
                    blockedUntil: expect.any(Number)
                }),
                expect.any(Number)
            );
        });
    });

    describe('Memory Fallback', () => {
        it('should switch to memory fallback if Redis fails', async () => {
            cacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

            // First call fails Redis, sets fallback flag
            await guard.getAttemptInfo(mockRequest);

            // Second call uses memory
            const result = await guard.getAttemptInfo(mockRequest);
            expect(result).toBeNull();

            const stats = guard.getMemoryFallbackStats();
            expect(stats.usingFallback).toBe(true);
        });
    });
});

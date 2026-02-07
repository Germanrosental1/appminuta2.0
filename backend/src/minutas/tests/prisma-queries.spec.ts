import { Test, TestingModule } from '@nestjs/testing';
import { MinutasService } from '../minutas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsCacheService } from '../../shared/iam/services/permissions-cache.service';
import { AuthorizationService } from '../../auth/authorization/authorization.service';
import { LoggerService } from '../../logger/logger.service';
import { MinutasGateway } from '../minutas.gateway';
import { UnitStateService } from '../services/unit-state.service';
import { MinutasStateService } from '../services/minutas-state.service';
import { MinutasQueryService } from '../services/minutas-query.service';
import { MinutasCommandService } from '../services/minutas-command.service';
import { MinutasPermissionsService } from '../services/minutas-permissions.service';

describe('MinutasService - Prisma Queries', () => {
    let service: MinutasService;
    let prismaService: jest.Mocked<PrismaService>;
    let permissionsCache: jest.Mocked<PermissionsCacheService>;

    const mockPrismaService = {
        minutasDefinitivas: {
            findMany: jest.fn(),
            count: jest.fn(),
        },
    };

    const mockPermissionsCache = {
        getOrFetch: jest.fn(),
    };

    const mockAuthService = {
        getUserRoleInProject: jest.fn(),
    };

    const mockLoggerService = {
        agregarLog: jest.fn(),
    };

    const mockGateway = {
        emitMinutaCreated: jest.fn(),
    };

    const mockUnitStateService = {
        reservarUnidades: jest.fn(),
    };

    const mockStateService = {
        handleStateChange: jest.fn(),
        validateStateTransition: jest.fn(),
    };

    const mockQueryService = {
        getCachedUserPermissions: jest.fn(),
        buildWhereClause: jest.fn(),
    };

    const mockCommandService = {
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    };

    const mockPermissionsService = {
        getCachedPermissions: jest.fn(),
        buildPermissionsFilter: jest.fn(),
        buildDateFilter: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MinutasService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: PermissionsCacheService, useValue: mockPermissionsCache },
                { provide: AuthorizationService, useValue: mockAuthService },
                { provide: LoggerService, useValue: mockLoggerService },
                { provide: MinutasGateway, useValue: mockGateway },
                { provide: UnitStateService, useValue: mockUnitStateService },
                { provide: MinutasStateService, useValue: mockStateService },
                { provide: MinutasQueryService, useValue: mockQueryService },
                { provide: MinutasCommandService, useValue: mockCommandService },
                { provide: MinutasPermissionsService, useValue: mockPermissionsService },
            ],
        }).compile();

        service = module.get<MinutasService>(MinutasService);

        // Default setup for permissions service to avoid failures in findAll
        mockPermissionsService.getCachedPermissions.mockResolvedValue({
            permissions: [],
            projectIds: [],
            roles: []
        });
        mockPermissionsService.buildPermissionsFilter.mockReturnValue({});
        mockPermissionsService.buildDateFilter.mockReturnValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Complex Filters', () => {
        it('should apply pagination correctly (page 2, limit 10)', async () => {
            const query = { page: 2, limit: 10 };
            const userId = 'user-123';

            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['verTodasMinutas'],
                projectIds: [],
                roles: ['adminmv'],
            });
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(25);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            await service.findAll(query, userId);

            expect(mockPrismaService.minutasDefinitivas.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 10, // (page 2 - 1) * 10
                    take: 10,
                })
            );
        });

        it('should filter by estado', async () => {
            const query = { page: 1, limit: 10, estado: 'aprobada' };
            const userId = 'user-123';

            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['verTodasMinutas'],
                projectIds: [],
                roles: ['adminmv'],
            });
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(5);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            await service.findAll(query, userId);

            expect(mockPrismaService.minutasDefinitivas.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        Estado: 'aprobada',
                    }),
                })
            );
        });

        it('should filter by fecha range (fechaDesde + fechaHasta)', async () => {
            const fechaDesde = new Date('2024-01-01');
            const fechaHasta = new Date('2024-12-31');
            const query = {
                page: 1,
                limit: 10,
                fechaDesde: fechaDesde.toISOString(),
                fechaHasta: fechaHasta.toISOString(),
            };
            const userId = 'user-123';

            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['verTodasMinutas'],
                projectIds: [],
                roles: ['adminmv'],
            });
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(10);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            mockPermissionsService.buildDateFilter.mockReturnValue({
                gte: expect.any(Date),
                lte: expect.any(Date),
            });

            await service.findAll(query, userId);

            expect(mockPrismaService.minutasDefinitivas.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        FechaCreacion: {
                            gte: expect.any(Date),
                            lte: expect.any(Date),
                        },
                    }),
                })
            );
        });

        it('should filter by proyecto with user permissions', async () => {
            const query = { page: 1, limit: 10, proyecto: 'proyecto-123' };
            const userId = 'user-123';

            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: [],
                projectIds: ['proyecto-123'],
                roles: ['vendedor'],
            });
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(8);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            mockPermissionsService.buildPermissionsFilter.mockReturnValue({
                OR: [
                    { UsuarioId: userId },
                    { Proyecto: 'proyecto-123' }
                ]
            });

            await service.findAll(query, userId);

            // For users without verTodasMinutas, the filter combines user ownership OR project access
            expect(mockPrismaService.minutasDefinitivas.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            expect.objectContaining({ UsuarioId: userId }),
                            expect.objectContaining({ Proyecto: 'proyecto-123' }),
                        ]),
                    }),
                })
            );
        });
    });

    describe('Count & Parallel Queries', () => {
        it('should execute count() and findMany() queries', async () => {
            const query = { page: 1, limit: 10 };
            const userId = 'user-123';

            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['verTodasMinutas'],
                projectIds: [],
                roles: ['adminmv'],
            });
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(42);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            const result = await service.findAll(query, userId);

            expect(mockPrismaService.minutasDefinitivas.count).toHaveBeenCalledTimes(1);
            expect(mockPrismaService.minutasDefinitivas.findMany).toHaveBeenCalledTimes(1);
            expect(result.total).toBe(42);
        });

        it('should calculate total pages correctly', async () => {
            const query = { page: 1, limit: 10 };
            const userId = 'user-123';

            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['verTodasMinutas'],
                projectIds: [],
                roles: ['adminmv'],
            });
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(25);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            const result = await service.findAll(query, userId);

            expect(result.totalPages).toBe(3); // Math.ceil(25 / 10) = 3
            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });
    });

    describe('Permission-based Filtering', () => {
        it('should allow verTodasMinutas to see all minutas', async () => {
            const query = { page: 1, limit: 10 };
            const userId = 'admin-user';

            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['verTodasMinutas'],
                projectIds: [],
                roles: ['adminmv'],
            });
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(100);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            await service.findAll(query, userId);

            // Should NOT filter by userId or proyecto when user has verTodasMinutas
            expect(mockPrismaService.minutasDefinitivas.findMany).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    where: expect.objectContaining({
                        UsuarioId: userId,
                    }),
                })
            );
        });

        it('should limit regular users to their own minutas + proyecto-assigned minutas', async () => {
            const query = { page: 1, limit: 10 };
            const userId = 'regular-user';

            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: [],
                projectIds: ['proyecto-123', 'proyecto-456'],
                roles: ['vendedor'],
            });
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(5);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            mockPermissionsService.buildPermissionsFilter.mockReturnValue({
                OR: [
                    { UsuarioId: userId },
                    { Proyecto: { in: ['proyecto-123', 'proyecto-456'] } }
                ]
            });

            await service.findAll(query, userId);

            // Should filter by user's own minutas OR assigned projects
            expect(mockPrismaService.minutasDefinitivas.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            { UsuarioId: userId },
                            { Proyecto: { in: ['proyecto-123', 'proyecto-456'] } },
                        ]),
                    }),
                })
            );
        });
    });
});

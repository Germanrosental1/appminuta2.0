import { Test, TestingModule } from '@nestjs/testing';
import { MinutasService } from './minutas.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinutasGateway } from './minutas.gateway';
import { MinutasStateService } from './services/minutas-state.service';
import { MinutasQueryService } from './services/minutas-query.service';
import { MinutasCommandService } from './services/minutas-command.service';
import { MinutasPermissionsService } from './services/minutas-permissions.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

/**
 * MinutasService tests - Thin Facade
 * 
 * These tests verify that MinutasService correctly delegates to specialized services:
 * - MinutasCommandService: create, update, remove
 * - MinutasQueryService: query building
 * - MinutasStateService: state transitions
 * - MinutasPermissionsService: permission handling
 */
describe('MinutasService', () => {
    let service: MinutasService;
    let prismaService: jest.Mocked<PrismaService>;

    const mockPrismaService = {
        minutasDefinitivas: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
        detallesVenta: {
            upsert: jest.fn(),
            updateMany: jest.fn(),
        },
        users: {
            findUnique: jest.fn(),
        },
        proyectos: {
            findFirst: jest.fn(),
        },
        usuariosRoles: {
            findMany: jest.fn(),
        },
        usuariosProyectos: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
        },
    };

    const mockGateway = {
        emitMinutaCreated: jest.fn(),
        emitMinutaStateChanged: jest.fn(),
    };

    const mockStateService = {
        handleStateChange: jest.fn(),
        validateStateTransition: jest.fn(),
        validateApprovalPermissions: jest.fn(),
        handleUnitEffects: jest.fn(),
        isFinalState: jest.fn(),
        getValidTransitions: jest.fn(),
    };

    const mockQueryService = {
        getCachedUserPermissions: jest.fn(),
        buildWhereClause: jest.fn(),
        buildPermissionsFilter: jest.fn(),
        buildDateFilter: jest.fn(),
    };

    const mockCommandService = {
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        validateUpdatePermissions: jest.fn(),
    };

    const mockPermissionsService = {
        getCachedPermissions: jest.fn(),
        invalidateUser: jest.fn(),
        clearAll: jest.fn(),
        getStats: jest.fn(),
        hasPermission: jest.fn(),
        canViewAllMinutas: jest.fn(),
        canEditMinuta: jest.fn(),
        canSignMinuta: jest.fn(),
        isGlobalAdmin: jest.fn(),
        hasProjectAccess: jest.fn(),
        buildPermissionsFilter: jest.fn(),
        buildDateFilter: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MinutasService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: MinutasStateService, useValue: mockStateService },
                { provide: MinutasQueryService, useValue: mockQueryService },
                { provide: MinutasCommandService, useValue: mockCommandService },
                { provide: MinutasPermissionsService, useValue: mockPermissionsService },
                { provide: MinutasGateway, useValue: mockGateway },
            ],
        }).compile();

        service = module.get<MinutasService>(MinutasService);

        // Default mock behaviors
        mockStateService.handleStateChange.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Delegation Tests', () => {

        describe('create', () => {
            it('should delegate to commandService.create', async () => {
                const userId = 'user-123';
                const createDto = {
                    estado: 'pendiente',
                    datos: { proyecto: 'Proyecto A' },
                };
                const mockResult = { Id: 'minuta-123', Estado: 'pendiente' };

                mockCommandService.create.mockResolvedValue(mockResult);

                const result = await service.create(createDto as any, userId);

                expect(result).toEqual(mockResult);
                expect(mockCommandService.create).toHaveBeenCalledWith(createDto, userId);
            });
        });

        describe('update', () => {
            it('should delegate to commandService.update', async () => {
                const userId = 'user-123';
                const updateDto = { estado: 'aprobada', version: 1 };
                const mockResult = { Id: 'minuta-123', Estado: 'aprobada' };

                mockCommandService.update.mockResolvedValue(mockResult);

                const result = await service.update('minuta-123', updateDto, userId);

                expect(result).toEqual(mockResult);
                expect(mockCommandService.update).toHaveBeenCalledWith(
                    'minuta-123',
                    updateDto,
                    userId,
                    expect.any(Function) // findOneFn callback
                );
            });
        });

        describe('remove', () => {
            it('should delegate to commandService.remove', async () => {
                const userId = 'user-123';
                const mockResult = { Id: 'minuta-123' };

                mockCommandService.remove.mockResolvedValue(mockResult);

                const result = await service.remove('minuta-123', userId);

                expect(result).toEqual(mockResult);
                expect(mockCommandService.remove).toHaveBeenCalledWith(
                    'minuta-123',
                    userId,
                    expect.any(Function) // findOneFn callback
                );
            });
        });
    });

    describe('findAll', () => {
        it('should use permissionsService for cached permissions', async () => {
            const userId = 'user-123';
            const query = { page: 1, limit: 10 };

            mockPermissionsService.getCachedPermissions.mockResolvedValue({
                permissions: ['verTodasMinutas'],
                projectIds: ['proyecto-123'],
                roles: ['adminmv'],
            });
            mockPermissionsService.buildPermissionsFilter.mockReturnValue(null);
            mockPermissionsService.buildDateFilter.mockReturnValue(null);

            const mockMinutas = [
                {
                    Id: 'minuta-1',
                    Estado: 'pendiente',
                    FechaCreacion: new Date(),
                    users: { email: 'user@example.com' },
                    Proyectos: { Nombre: 'Proyecto A' },
                },
            ];

            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(1);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue(mockMinutas);

            const result = await service.findAll(query as any, userId);

            expect(mockPermissionsService.getCachedPermissions).toHaveBeenCalledWith(userId);
            expect(result.total).toBe(1);
            expect(result.data).toHaveLength(1);
        });

        it('should handle empty result set', async () => {
            mockPermissionsService.getCachedPermissions.mockResolvedValue({
                permissions: [],
                projectIds: [],
                roles: [],
            });
            mockPermissionsService.buildPermissionsFilter.mockReturnValue(null);
            mockPermissionsService.buildDateFilter.mockReturnValue(null);
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(0);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            const result = await service.findAll({ page: 1, limit: 10 } as any, 'user-123');

            expect(result.total).toBe(0);
            expect(result.data).toHaveLength(0);
        });

        it('should cap limit at maximum of 100', async () => {
            mockPermissionsService.getCachedPermissions.mockResolvedValue({
                permissions: [],
                projectIds: [],
                roles: [],
            });
            mockPermissionsService.buildPermissionsFilter.mockReturnValue(null);
            mockPermissionsService.buildDateFilter.mockReturnValue(null);
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(0);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue([]);

            await service.findAll({ page: 1, limit: 500 } as any, 'user-123');

            expect(mockPrismaService.minutasDefinitivas.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 100 })
            );
        });
    });

    describe('findOne', () => {
        it('should return minuta if user is owner', async () => {
            const userId = 'user-123';
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: userId,
                Estado: 'pendiente',
                users: { email: 'user@example.com' },
                Proyectos: { Nombre: 'Proyecto A' },
                Dato: {},
            };

            mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
            mockPermissionsService.canViewAllMinutas.mockResolvedValue(false);
            mockPermissionsService.hasProjectAccess.mockResolvedValue(false);
            mockPermissionsService.canSignMinuta.mockResolvedValue(false);

            const result = await service.findOne('minuta-123', userId);

            expect(result.Id).toBe('minuta-123');
        });

        it('should throw NotFoundException if minuta does not exist', async () => {
            mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(null);

            await expect(service.findOne('nonexistent', 'user-123')).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if user has no access', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'other-user',
                Estado: 'pendiente',
            };

            mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
            mockPermissionsService.canViewAllMinutas.mockResolvedValue(false);
            mockPermissionsService.hasProjectAccess.mockResolvedValue(false);
            mockPermissionsService.canSignMinuta.mockResolvedValue(false);

            await expect(service.findOne('minuta-123', 'user-123')).rejects.toThrow(ForbiddenException);
        });

        it('should allow access if user can view all minutas', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'other-user',
                Estado: 'pendiente',
                users: { email: 'user@example.com' },
                Proyectos: { Nombre: 'Proyecto A' },
                Dato: {},
            };

            mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
            mockPermissionsService.canViewAllMinutas.mockResolvedValue(true);

            const result = await service.findOne('minuta-123', 'user-123');

            expect(result.Id).toBe('minuta-123');
        });

        it('should allow access if user has project access', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'other-user',
                Estado: 'pendiente',
                Proyecto: 'proyecto-123',
                users: { email: 'user@example.com' },
                Proyectos: { Nombre: 'Proyecto A' },
                Dato: {},
            };

            mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
            mockPermissionsService.canViewAllMinutas.mockResolvedValue(false);
            mockPermissionsService.hasProjectAccess.mockResolvedValue(true);

            const result = await service.findOne('minuta-123', 'user-123');

            expect(result.Id).toBe('minuta-123');
        });

        it('should allow signer to view approved minutas', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'other-user',
                Estado: 'aprobada',
                Proyecto: 'proyecto-123',
                users: { email: 'user@example.com' },
                Proyectos: { Nombre: 'Proyecto A' },
                Dato: {},
            };

            mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
            mockPermissionsService.canViewAllMinutas.mockResolvedValue(false);
            mockPermissionsService.hasProjectAccess.mockResolvedValue(false);
            mockPermissionsService.canSignMinuta.mockResolvedValue(true);

            const result = await service.findOne('minuta-123', 'user-123');

            expect(result.Id).toBe('minuta-123');
        });
    });

    describe('State Helpers', () => {
        it('should delegate getValidTransitions to stateService', () => {
            mockStateService.getValidTransitions.mockReturnValue(['aprobada', 'cancelada']);

            const result = service.getValidTransitions('pendiente');

            expect(result).toEqual(['aprobada', 'cancelada']);
            expect(mockStateService.getValidTransitions).toHaveBeenCalledWith('pendiente');
        });

        it('should delegate isFinalState to stateService', () => {
            mockStateService.isFinalState.mockReturnValue(true);

            const result = service.isFinalState('firmada');

            expect(result).toBe(true);
            expect(mockStateService.isFinalState).toHaveBeenCalledWith('firmada');
        });
    });

    describe('Cache Management', () => {
        it('should expose cache stats via getPermissionsCacheStats', async () => {
            const mockStats = { hitRate: 0.95, size: 100 };
            mockPermissionsService.getStats.mockResolvedValue(mockStats);

            const result = await service.getPermissionsCacheStats();

            expect(result).toEqual(mockStats);
            expect(mockPermissionsService.getStats).toHaveBeenCalled();
        });

        it('should invalidate user cache correctly', async () => {
            mockPermissionsService.invalidateUser.mockResolvedValue(undefined);

            await service.invalidateUserCache('user-123');

            expect(mockPermissionsService.invalidateUser).toHaveBeenCalledWith('user-123');
        });

        it('should clear all cache correctly', async () => {
            mockPermissionsService.clearAll.mockResolvedValue(undefined);

            await service.clearAllCache();

            expect(mockPermissionsService.clearAll).toHaveBeenCalled();
        });
    });

    describe('Document Generation', () => {
        it('should throw error if N8N_WEBHOOK_URL not configured', async () => {
            const originalEnv = process.env.N8N_WEBHOOK_URL;
            delete process.env.N8N_WEBHOOK_URL;

            await expect(service.generate({ data: 'test' })).rejects.toThrow('N8N_WEBHOOK_URL not configured');

            process.env.N8N_WEBHOOK_URL = originalEnv;
        });
    });

    describe('Provisoria Methods (Not Implemented)', () => {
        it('should throw error for createProvisoria', async () => {
            await expect(service.createProvisoria({} as any, 'user-123')).rejects.toThrow('not implemented');
        });

        it('should throw error for updateProvisoria', async () => {
            await expect(service.updateProvisoria('id', {})).rejects.toThrow('not implemented');
        });
    });
});

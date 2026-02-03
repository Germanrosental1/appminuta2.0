import { Test, TestingModule } from '@nestjs/testing';
import { MinutasService } from './minutas.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinutasGateway } from './minutas.gateway';
import { UnitStateService } from './services/unit-state.service';
import { LoggerService } from '../logger/logger.service';
import { AuthorizationService } from '../auth/authorization/authorization.service';
import { PermissionsCacheService } from '../shared/iam/services/permissions-cache.service';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';

describe('MinutasService', () => {
    let service: MinutasService;
    let prismaService: jest.Mocked<PrismaService>;
    let unitStateService: jest.Mocked<UnitStateService>;
    let authService: jest.Mocked<AuthorizationService>;
    let permissionsCache: jest.Mocked<PermissionsCacheService>;
    let gateway: jest.Mocked<MinutasGateway>;

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

    const mockUnitStateService = {
        reservarUnidades: jest.fn(),
        liberarUnidades: jest.fn(),
    };

    const mockLoggerService = {
        agregarLog: jest.fn(),
    };

    const mockAuthService = {
        getUserRoleInProject: jest.fn(),
    };

    const mockPermissionsCache = {
        getOrFetch: jest.fn(),
    };

    const mockGateway = {
        emitMinutaCreated: jest.fn(),
        emitMinutaStateChanged: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MinutasService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: UnitStateService, useValue: mockUnitStateService },
                { provide: LoggerService, useValue: mockLoggerService },
                { provide: AuthorizationService, useValue: mockAuthService },
                { provide: PermissionsCacheService, useValue: mockPermissionsCache },
                { provide: MinutasGateway, useValue: mockGateway },
            ],
        }).compile();

        service = module.get<MinutasService>(MinutasService);
        // Other services available via module.get if needed
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('CRUD Operations', () => {
        describe('create', () => {
            it('should create minuta with sanitization and unit reservation', async () => {
                const userId = 'user-123';
                const createDto = {
                    estado: 'pendiente',
                    datos: {
                        proyecto: 'Proyecto A',
                        unidades: [{ id: 'unit-1' }, { id: 'unit-2' }],
                    },
                    comentarios: '<script>alert("xss")</script>Valid comment',
                };

                const mockProyecto = { Id: 'proyecto-123' };
                const mockMinuta = {
                    Id: 'minuta-123',
                    Estado: 'pendiente',
                    Proyecto: 'proyecto-123',
                    UsuarioId: userId,
                    FechaCreacion: new Date(),
                };

                mockPrismaService.proyectos.findFirst.mockResolvedValue(mockProyecto);
                mockPrismaService.minutasDefinitivas.create.mockResolvedValue(mockMinuta);
                mockUnitStateService.reservarUnidades.mockResolvedValue(undefined);
                mockPrismaService.detallesVenta.upsert.mockResolvedValue({} as any);
                mockPrismaService.users.findUnique.mockResolvedValue({ email: 'user@example.com' });
                mockLoggerService.agregarLog.mockResolvedValue(undefined);

                const result = await service.create(createDto as any, userId);

                expect(result).toEqual(mockMinuta);
                expect(mockUnitStateService.reservarUnidades).toHaveBeenCalledWith(['unit-1', 'unit-2']);
                expect(mockGateway.emitMinutaCreated).toHaveBeenCalled();
            });
        });

        describe('findAll', () => {
            it('should return paginated minutas with permissions filter', async () => {
                const userId = 'user-123';
                const query = { page: 1, limit: 10 };

                const mockUserPermissions = {
                    permissions: ['verTodasMinutas'],
                    projectIds: ['proyecto-123'],
                    roles: ['adminmv'],
                };

                const mockMinutas = [
                    {
                        Id: 'minuta-1',
                        Estado: 'pendiente',
                        FechaCreacion: new Date(),
                        users: { email: 'user@example.com' },
                        Proyectos: { Nombre: 'Proyecto A' },
                    },
                ];

                mockPermissionsCache.getOrFetch.mockResolvedValue(mockUserPermissions);
                mockPrismaService.minutasDefinitivas.count.mockResolvedValue(1);
                mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue(mockMinutas);

                const result = await service.findAll(query as any, userId);

                expect(result.total).toBe(1);
                expect(result.data).toHaveLength(1);
            });
        });

        describe('findOne', () => {
            it('should return minuta if user is owner', async () => {
                const userId = 'user-123';
                const minutaId = 'minuta-123';

                const mockMinuta = {
                    Id: minutaId,
                    UsuarioId: userId,
                    Estado: 'pendiente',
                    users: { email: 'user@example.com' },
                    Proyectos: { Nombre: 'Proyecto A' },
                    Dato: {},
                };

                mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
                mockPrismaService.usuariosRoles.findMany.mockResolvedValue([]);

                const result = await service.findOne(minutaId, userId);

                expect(result.Id).toBe(minutaId);
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
                mockPrismaService.usuariosRoles.findMany.mockResolvedValue([]);
                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue(null);

                await expect(service.findOne('minuta-123', 'user-123')).rejects.toThrow(ForbiddenException);
            });
        });

        describe('update', () => {
            it('should update minuta with optimistic locking', async () => {
                const mockMinuta = {
                    Id: 'minuta-123',
                    UsuarioId: 'user-123',
                    Estado: 'pendiente',
                    Version: 1,
                    Proyecto: 'proyecto-123',
                    Dato: { unidades: [] },
                };

                const mockUpdatedMinuta = {
                    ...mockMinuta,
                    Estado: 'aprobada',
                    Version: 2,
                    users: { email: 'user@example.com' },
                    Proyectos: { Nombre: 'Proyecto A' },
                };

                mockPrismaService.minutasDefinitivas.findUnique
                    .mockResolvedValueOnce(mockMinuta)
                    .mockResolvedValueOnce(mockUpdatedMinuta);
                mockPermissionsCache.getOrFetch.mockResolvedValue({
                    permissions: ['editarMinuta'],
                    projectIds: ['proyecto-123'],
                    roles: ['jefe_ventas'],
                });
                mockAuthService.getUserRoleInProject.mockResolvedValue('jefe_ventas');
                mockPrismaService.minutasDefinitivas.update.mockResolvedValue(mockUpdatedMinuta);
                mockPrismaService.users.findUnique.mockResolvedValue({ email: 'user@example.com' });
                mockLoggerService.agregarLog.mockResolvedValue(undefined);

                const result = await service.update('minuta-123', { estado: 'aprobada', version: 1 }, 'user-123');

                expect(result.Estado).toBe('aprobada');
            });

            it('should throw ConflictException if version mismatch', async () => {
                const mockMinuta = {
                    Id: 'minuta-123',
                    UsuarioId: 'user-123',
                    Estado: 'pendiente',
                    Version: 2,
                    Proyecto: 'proyecto-123',
                    Dato: {},
                };

                mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
                mockPermissionsCache.getOrFetch.mockResolvedValue({
                    permissions: ['editarMinuta'],
                    projectIds: ['proyecto-123'],
                    roles: ['jefe_ventas'],
                });
                mockAuthService.getUserRoleInProject.mockResolvedValue('jefe_ventas');

                await expect(
                    service.update('minuta-123', { estado: 'aprobada', version: 1 }, 'user-123')
                ).rejects.toThrow(ConflictException);
            });
        });

        describe('remove', () => {
            it('should delete minuta and create audit log', async () => {
                const mockMinuta = {
                    Id: 'minuta-123',
                    UsuarioId: 'user-123',
                    Estado: 'pendiente',
                    Dato: {},
                };

                mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
                mockPrismaService.usuariosRoles.findMany.mockResolvedValue([]);
                mockPrismaService.minutasDefinitivas.delete.mockResolvedValue(mockMinuta);
                mockPrismaService.users.findUnique.mockResolvedValue({ email: 'user@example.com' });
                mockLoggerService.agregarLog.mockResolvedValue(undefined);

                const result = await service.remove('minuta-123', 'user-123');

                expect(result).toEqual(mockMinuta);
                expect(mockLoggerService.agregarLog).toHaveBeenCalled();
            });
        });
    });

    describe('State Transitions', () => {
        it('should allow pendiente → aprobada transition', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'user-123',
                Estado: 'pendiente',
                Version: 1,
                Proyecto: 'proyecto-123',
                Dato: { unidades: [] },
            };

            const mockUpdatedMinuta = {
                ...mockMinuta,
                Estado: 'aprobada',
                Version: 2,
                users: { email: 'user@example.com' },
                Proyectos: { Nombre: 'Proyecto A' },
            };

            mockPrismaService.minutasDefinitivas.findUnique
                .mockResolvedValueOnce(mockMinuta)
                .mockResolvedValueOnce(mockUpdatedMinuta);
            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['editarMinuta'],
                projectIds: ['proyecto-123'],
                roles: ['jefe_ventas'],
            });
            mockAuthService.getUserRoleInProject.mockResolvedValue('jefe_ventas');
            mockPrismaService.minutasDefinitivas.update.mockResolvedValue(mockUpdatedMinuta);

            const result = await service.update('minuta-123', { estado: 'aprobada', version: 1 }, 'user-123');

            expect(result.Estado).toBe('aprobada');
        });

        it('should reject invalid state transitions', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'user-123',
                Estado: 'firmada',
                Version: 1,
                Proyecto: 'proyecto-123',
                Dato: { unidades: [] },
            };

            mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['editarMinuta'],
                projectIds: ['proyecto-123'],
                roles: ['jefe_ventas'],
            });
            mockAuthService.getUserRoleInProject.mockResolvedValue('jefe_ventas');

            await expect(
                service.update('minuta-123', { estado: 'pendiente', version: 1 }, 'user-123')
            ).rejects.toThrow(BadRequestException);
        });

        it('should require comments for cancelada state', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'user-123',
                Estado: 'pendiente',
                Version: 1,
                Proyecto: 'proyecto-123',
                Dato: { unidades: [] },
            };

            mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['editarMinuta'],
                projectIds: ['proyecto-123'],
                roles: ['jefe_ventas'],
            });
            mockAuthService.getUserRoleInProject.mockResolvedValue('jefe_ventas');

            await expect(
                service.update('minuta-123', { estado: 'cancelada', version: 1 }, 'user-123')
            ).rejects.toThrow(BadRequestException);
        });

        it('should release units when transitioning to cancelada', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'user-123',
                Estado: 'pendiente',
                Version: 1,
                Proyecto: 'proyecto-123',
                Dato: { unidades: [{ id: 'unit-1' }, { id: 'unit-2' }] },
            };

            const mockUpdatedMinuta = {
                ...mockMinuta,
                Estado: 'cancelada',
                Version: 2,
                users: { email: 'user@example.com' },
                Proyectos: { Nombre: 'Proyecto A' },
            };

            mockPrismaService.minutasDefinitivas.findUnique
                .mockResolvedValueOnce(mockMinuta)
                .mockResolvedValueOnce(mockUpdatedMinuta);
            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['editarMinuta'],
                projectIds: ['proyecto-123'],
                roles: ['jefe_ventas'],
            });
            mockAuthService.getUserRoleInProject.mockResolvedValue('jefe_ventas');
            mockPrismaService.minutasDefinitivas.update.mockResolvedValue(mockUpdatedMinuta);
            mockUnitStateService.liberarUnidades.mockResolvedValue(undefined);
            mockPrismaService.detallesVenta.updateMany.mockResolvedValue({ count: 2 });
            mockPrismaService.users.findUnique.mockResolvedValue({ email: 'user@example.com' });
            mockLoggerService.agregarLog.mockResolvedValue(undefined);

            await service.update('minuta-123', {
                estado: 'cancelada',
                version: 1,
                comentarios: 'Cliente desistió de la compra'
            }, 'user-123');

            expect(mockUnitStateService.liberarUnidades).toHaveBeenCalledWith(['unit-1', 'unit-2']);
        });
    });

    describe('Permissions & Authorization', () => {
        it('should allow user with verTodasMinutas to access all minutas', async () => {
            const mockUserPermissions = {
                permissions: ['verTodasMinutas'],
                projectIds: [],
                roles: ['adminmv'],
            };

            const mockMinutas = [
                {
                    Id: 'minuta-1',
                    Estado: 'pendiente',
                    FechaCreacion: new Date(),
                    users: { email: 'other@example.com' },
                    Proyectos: { Nombre: 'Proyecto A' },
                },
            ];

            mockPermissionsCache.getOrFetch.mockResolvedValue(mockUserPermissions);
            mockPrismaService.minutasDefinitivas.count.mockResolvedValue(1);
            mockPrismaService.minutasDefinitivas.findMany.mockResolvedValue(mockMinutas);

            const result = await service.findAll({ page: 1, limit: 10 } as any, 'admin-user');

            expect(result.data).toHaveLength(1);
        });

        it('should allow SuperAdminMV to bypass project restrictions', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'other-user',
                Estado: 'en revisión',
                Version: 1,
                Proyecto: 'proyecto-123',
                Dato: { unidades: [] },
            };

            const mockUpdatedMinuta = {
                ...mockMinuta,
                Estado: 'Definitiva',
                Version: 2,
                users: { email: 'admin@example.com' },
                Proyectos: { Nombre: 'Proyecto A' },
            };

            mockPrismaService.minutasDefinitivas.findUnique
                .mockResolvedValueOnce(mockMinuta)
                .mockResolvedValueOnce(mockUpdatedMinuta);
            mockPermissionsCache.getOrFetch.mockResolvedValue({
                permissions: ['verTodasMinutas'],
                projectIds: [],
                roles: ['superadminmv'],
            });
            mockAuthService.getUserRoleInProject.mockResolvedValue(null);
            mockPrismaService.minutasDefinitivas.update.mockResolvedValue(mockUpdatedMinuta);

            const result = await service.update('minuta-123', { estado: 'Definitiva', version: 1 }, 'super-admin');

            expect(result.Estado).toBe('Definitiva');
        });

        it('should deny access if user not in proyecto and not owner', async () => {
            const mockMinuta = {
                Id: 'minuta-123',
                UsuarioId: 'other-user',
                Estado: 'pendiente',
                Proyecto: 'proyecto-999',
            };

            mockPrismaService.minutasDefinitivas.findUnique.mockResolvedValue(mockMinuta);
            mockPrismaService.usuariosRoles.findMany.mockResolvedValue([]);
            mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue(null);

            await expect(service.findOne('minuta-123', 'user-123')).rejects.toThrow(ForbiddenException);
        });
    });
});

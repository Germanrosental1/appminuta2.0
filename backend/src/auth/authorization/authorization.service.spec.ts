import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from './authorization.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoggerService } from '../../logger/logger.service';

describe('AuthorizationService', () => {
    let service: AuthorizationService;
    let prismaService: jest.Mocked<PrismaService>;
    let loggerService: jest.Mocked<LoggerService>;

    const mockPrismaService = {
        roles: {
            findFirst: jest.fn(),
        },
        usuariosOrganizaciones: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
        },
        usuariosProyectos: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            upsert: jest.fn(),
        },
        proyectos: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        profiles: {
            findUnique: jest.fn(),
        },
        users: {
            findUnique: jest.fn(),
        },
    };

    const mockLoggerService = {
        agregarLog: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthorizationService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: LoggerService, useValue: mockLoggerService },
            ],
        }).compile();

        service = module.get<AuthorizationService>(AuthorizationService);
        // prismaService and loggerService available via module.get if needed
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Organization Ownership', () => {
        describe('isOrganizationOwner', () => {
            it('should return true if user is SuperAdminMV in organization', async () => {
                const userId = 'user-123';
                const orgId = 'org-123';
                const superAdminRoleId = 'role-superadmin';

                mockPrismaService.roles.findFirst.mockResolvedValue({
                    Id: superAdminRoleId,
                    Nombre: 'superadminmv',
                } as any);

                mockPrismaService.usuariosOrganizaciones.findFirst.mockResolvedValue({
                    UserId: userId,
                    IdOrg: orgId,
                    IdRol: superAdminRoleId,
                } as any);

                const result = await service.isOrganizationOwner(userId, orgId);

                expect(result).toBe(true);
                expect(mockPrismaService.roles.findFirst).toHaveBeenCalledWith({
                    where: { Nombre: 'superadminmv' },
                    select: { Id: true },
                });
                expect(mockPrismaService.usuariosOrganizaciones.findFirst).toHaveBeenCalledWith({
                    where: {
                        UserId: userId,
                        IdOrg: orgId,
                        IdRol: superAdminRoleId,
                    },
                });
            });

            it('should return false if user is not SuperAdminMV', async () => {
                const userId = 'user-123';
                const orgId = 'org-123';

                mockPrismaService.roles.findFirst.mockResolvedValue({
                    Id: 'role-superadmin',
                    Nombre: 'superadminmv',
                } as any);

                mockPrismaService.usuariosOrganizaciones.findFirst.mockResolvedValue(null);

                const result = await service.isOrganizationOwner(userId, orgId);

                expect(result).toBe(false);
            });

            it('should return false if SuperAdminMV role does not exist', async () => {
                const userId = 'user-123';
                const orgId = 'org-123';

                mockPrismaService.roles.findFirst.mockResolvedValue(null);

                const result = await service.isOrganizationOwner(userId, orgId);

                expect(result).toBe(false);
            });
        });
    });

    describe('Project Role Management', () => {
        describe('getUserRoleInProject', () => {
            it('should return role name if user is assigned to project', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';

                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue({
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    Roles: {
                        Nombre: 'jefe_ventas',
                    },
                } as any);

                const result = await service.getUserRoleInProject(userId, projectId);

                expect(result).toBe('jefe_ventas');
                expect(mockPrismaService.usuariosProyectos.findFirst).toHaveBeenCalledWith({
                    where: {
                        IdUsuario: userId,
                        IdProyecto: projectId,
                    },
                    include: {
                        Roles: true,
                    },
                });
            });

            it('should return null if user is not assigned to project', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';

                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue(null);

                const result = await service.getUserRoleInProject(userId, projectId);

                expect(result).toBeNull();
            });
        });

        describe('hasRoleInProject', () => {
            it('should return true for SuperAdminMV regardless of assigned role', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';
                const requiredRole = 'vendedor';

                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue({
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    Roles: {
                        Nombre: 'superadminmv',
                    },
                } as any);

                const result = await service.hasRoleInProject(userId, projectId, requiredRole);

                expect(result).toBe(true);
            });

            it('should return true for AdminMV regardless of assigned role', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';
                const requiredRole = 'vendedor';

                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue({
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    Roles: {
                        Nombre: 'adminmv',
                    },
                } as any);

                const result = await service.hasRoleInProject(userId, projectId, requiredRole);

                expect(result).toBe(true);
            });

            it('should return true if user has exact required role', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';
                const requiredRole = 'jefe_ventas';

                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue({
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    Roles: {
                        Nombre: 'jefe_ventas',
                    },
                } as any);

                const result = await service.hasRoleInProject(userId, projectId, requiredRole);

                expect(result).toBe(true);
            });

            it('should return false if user has different role', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';
                const requiredRole = 'jefe_ventas';

                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue({
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    Roles: {
                        Nombre: 'vendedor',
                    },
                } as any);

                const result = await service.hasRoleInProject(userId, projectId, requiredRole);

                expect(result).toBe(false);
            });
        });
    });

    describe('Project Access', () => {
        describe('getUserProjects', () => {
            it('should return directly assigned projects', async () => {
                const userId = 'user-123';

                mockPrismaService.usuariosProyectos.findMany.mockResolvedValue([
                    { IdProyecto: 'project-1' },
                    { IdProyecto: 'project-2' },
                ] as any);

                mockPrismaService.roles.findFirst.mockResolvedValue({
                    Id: 'role-superadmin',
                } as any);

                mockPrismaService.usuariosOrganizaciones.findMany.mockResolvedValue([]);

                const result = await service.getUserProjects(userId);

                expect(result).toEqual(['project-1', 'project-2']);
            });

            it('should return all org projects if user is SuperAdminMV', async () => {
                const userId = 'superadmin-123';
                const orgId = 'org-123';
                const superAdminRoleId = 'role-superadmin';

                mockPrismaService.usuariosProyectos.findMany.mockResolvedValue([]);

                mockPrismaService.roles.findFirst.mockResolvedValue({
                    Id: superAdminRoleId,
                    Nombre: 'superadminmv',
                } as any);

                mockPrismaService.usuariosOrganizaciones.findMany.mockResolvedValue([
                    {
                        UserId: userId,
                        IdOrg: orgId,
                        IdRol: superAdminRoleId,
                    },
                ] as any);

                mockPrismaService.proyectos.findMany.mockResolvedValue([
                    { Id: 'project-1' },
                    { Id: 'project-2' },
                    { Id: 'project-3' },
                ] as any);

                const result = await service.getUserProjects(userId);

                expect(result).toEqual(['project-1', 'project-2', 'project-3']);
                expect(mockPrismaService.proyectos.findMany).toHaveBeenCalledWith({
                    where: { IdOrg: orgId },
                    select: { Id: true },
                });
            });

            it('should return unique project IDs (no duplicates)', async () => {
                const userId = 'user-123';

                mockPrismaService.usuariosProyectos.findMany.mockResolvedValue([
                    { IdProyecto: 'project-1' },
                    { IdProyecto: 'project-1' }, // Duplicate
                ] as any);

                mockPrismaService.roles.findFirst.mockResolvedValue(null);

                const result = await service.getUserProjects(userId);

                expect(result).toEqual(['project-1']);
            });
        });

        describe('getUserProjectsDetailed', () => {
            it('should return detailed project information', async () => {
                const userId = 'user-123';

                mockPrismaService.usuariosProyectos.findMany.mockResolvedValue([
                    { IdProyecto: 'project-1' },
                ] as any);

                mockPrismaService.roles.findFirst.mockResolvedValue(null);

                mockPrismaService.proyectos.findMany.mockResolvedValue([
                    {
                        Id: 'project-1',
                        Nombre: 'Proyecto A',
                        CreatedAt: new Date('2024-01-01'),
                        IdOrg: 'org-123',
                    },
                ] as any);

                const result = await service.getUserProjectsDetailed(userId);

                expect(result).toEqual([
                    {
                        Id: 'project-1',
                        Nombre: 'Proyecto A',
                        CreatedAt: expect.any(Date),
                        IdOrg: 'org-123',
                    },
                ]);
            });

            it('should return empty array if user has no projects', async () => {
                const userId = 'user-123';

                mockPrismaService.usuariosProyectos.findMany.mockResolvedValue([]);
                mockPrismaService.roles.findFirst.mockResolvedValue(null);

                const result = await service.getUserProjectsDetailed(userId);

                expect(result).toEqual([]);
            });
        });

        describe('canAccessProject', () => {
            it('should return true if user is owner of organization', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';
                const orgId = 'org-123';

                mockPrismaService.proyectos.findUnique.mockResolvedValue({
                    Id: projectId,
                    IdOrg: orgId,
                } as any);

                mockPrismaService.roles.findFirst.mockResolvedValue({
                    Id: 'role-superadmin',
                    Nombre: 'superadminmv',
                } as any);

                mockPrismaService.usuariosOrganizaciones.findFirst.mockResolvedValue({
                    UserId: userId,
                    IdOrg: orgId,
                } as any);

                const result = await service.canAccessProject(userId, projectId);

                expect(result).toBe(true);
            });

            it('should return true if user has role in project', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';

                mockPrismaService.proyectos.findUnique.mockResolvedValue({
                    Id: projectId,
                    IdOrg: 'org-123',
                } as any);

                mockPrismaService.roles.findFirst.mockResolvedValue(null);

                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue({
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    Roles: { Nombre: 'vendedor' },
                } as any);

                const result = await service.canAccessProject(userId, projectId);

                expect(result).toBe(true);
            });

            it('should return false if user has no access', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';

                mockPrismaService.proyectos.findUnique.mockResolvedValue({
                    Id: projectId,
                    IdOrg: 'org-123',
                } as any);

                mockPrismaService.roles.findFirst.mockResolvedValue(null);
                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue(null);

                const result = await service.canAccessProject(userId, projectId);

                expect(result).toBe(false);
            });
        });
    });

    describe('Permissions', () => {
        describe('getUserPermissions', () => {
            it('should return permissions for user role in project', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';

                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue({
                    IdUsuario: userId,
                    IdProyecto: projectId,
                    Roles: {
                        Nombre: 'jefe_ventas',
                    },
                } as any);

                mockPrismaService.roles.findFirst.mockResolvedValue({
                    Nombre: 'jefe_ventas',
                    RolesPermisos: [
                        { Permisos: { Nombre: 'crearMinuta' } },
                        { Permisos: { Nombre: 'editarMinuta' } },
                        { Permisos: { Nombre: 'aprobarRechazarMinuta' } },
                    ],
                } as any);

                const result = await service.getUserPermissions(userId, projectId);

                expect(result).toEqual(['crearMinuta', 'editarMinuta', 'aprobarRechazarMinuta']);
            });

            it('should return empty array if user has no role in project', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';

                mockPrismaService.usuariosProyectos.findFirst.mockResolvedValue(null);

                const result = await service.getUserPermissions(userId, projectId);

                expect(result).toEqual([]);
            });
        });
    });

    describe('Assignment', () => {
        describe('assignUserToProject', () => {
            it('should assign user to project and auto-add to organization', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';
                const roleId = 'role-vendedor';
                const assignedBy = 'admin-user';
                const orgId = 'org-123';

                mockPrismaService.proyectos.findUnique.mockResolvedValue({
                    Id: projectId,
                    IdOrg: orgId,
                } as any);

                mockPrismaService.roles.findFirst.mockResolvedValue({
                    Id: 'role-superadmin',
                    Nombre: 'superadminmv',
                } as any);

                mockPrismaService.usuariosOrganizaciones.findFirst.mockResolvedValue({
                    UserId: assignedBy,
                    IdOrg: orgId,
                } as any);

                mockPrismaService.usuariosProyectos.upsert.mockResolvedValue({} as any);

                mockPrismaService.usuariosOrganizaciones.findFirst
                    .mockResolvedValueOnce({ UserId: assignedBy, IdOrg: orgId } as any) // For owner check
                    .mockResolvedValueOnce(null); // For user existence check

                mockPrismaService.usuariosOrganizaciones.create.mockResolvedValue({} as any);
                mockPrismaService.users.findUnique.mockResolvedValue({ email: 'admin@example.com' } as any);
                mockLoggerService.agregarLog.mockResolvedValue(undefined);

                const result = await service.assignUserToProject(userId, projectId, roleId, assignedBy);

                expect(result.success).toBe(true);
                expect(mockPrismaService.usuariosProyectos.upsert).toHaveBeenCalled();
                expect(mockPrismaService.usuariosOrganizaciones.create).toHaveBeenCalledWith({
                    data: {
                        UserId: userId,
                        IdOrg: orgId,
                        IdRol: roleId,
                    },
                });
                expect(mockLoggerService.agregarLog).toHaveBeenCalledWith(
                    expect.objectContaining({
                        motivo: 'Asignación de Usuario a Proyecto',
                        impacto: 'Alto',
                    }),
                );
            });

            it('should throw error if assigning user is not organization owner', async () => {
                const userId = 'user-123';
                const projectId = 'project-123';
                const roleId = 'role-vendedor';
                const assignedBy = 'non-owner';
                const orgId = 'org-123';

                mockPrismaService.proyectos.findUnique.mockResolvedValue({
                    Id: projectId,
                    IdOrg: orgId,
                } as any);

                mockPrismaService.roles.findFirst.mockResolvedValue({
                    Id: 'role-superadmin',
                } as any);

                mockPrismaService.usuariosOrganizaciones.findFirst.mockResolvedValue(null);

                await expect(
                    service.assignUserToProject(userId, projectId, roleId, assignedBy),
                ).rejects.toThrow('Solo el owner de la organización puede asignar usuarios a proyectos');
            });
        });
    });
});

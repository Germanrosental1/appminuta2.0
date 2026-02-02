import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { UsuariosRolesService } from '../../shared/iam/usuarios-roles/usuarios-roles.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

describe('PermissionsGuard', () => {
    let guard: PermissionsGuard;
    let reflector: Reflector;
    let usuariosRolesService: UsuariosRolesService;

    const mockReflector = {
        getAllAndOverride: jest.fn(),
    };

    const mockUsuariosRolesService = {
        getUserPermissions: jest.fn(),
    };

    const mockExecutionContext = (user?: any) => ({
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
                user,
            }),
        }),
    } as unknown as ExecutionContext);

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PermissionsGuard,
                {
                    provide: Reflector,
                    useValue: mockReflector,
                },
                {
                    provide: UsuariosRolesService,
                    useValue: mockUsuariosRolesService,
                },
            ],
        }).compile();

        guard = module.get<PermissionsGuard>(PermissionsGuard);
        reflector = module.get<Reflector>(Reflector);
        usuariosRolesService = module.get<UsuariosRolesService>(UsuariosRolesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('canActivate', () => {
        it('should allow access when no permissions are required', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(undefined);
            const context = mockExecutionContext({ id: 'user-123' });

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
                PERMISSIONS_KEY,
                [context.getHandler(), context.getClass()],
            );
            expect(mockUsuariosRolesService.getUserPermissions).not.toHaveBeenCalled();
        });

        it('should allow access when permissions array is empty', async () => {
            mockReflector.getAllAndOverride.mockReturnValue([]);
            const context = mockExecutionContext({ id: 'user-123' });

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(mockUsuariosRolesService.getUserPermissions).not.toHaveBeenCalled();
        });

        it('should throw ForbiddenException when user is not authenticated', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(['read:units']);
            const context = mockExecutionContext(undefined);

            await expect(guard.canActivate(context)).rejects.toThrow(
                new ForbiddenException('Usuario no autenticado'),
            );

            expect(mockUsuariosRolesService.getUserPermissions).not.toHaveBeenCalled();
        });

        it('should throw ForbiddenException when user has no id', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(['read:units']);
            const context = mockExecutionContext({ email: 'test@example.com' });

            await expect(guard.canActivate(context)).rejects.toThrow(
                new ForbiddenException('Usuario no autenticado'),
            );

            expect(mockUsuariosRolesService.getUserPermissions).not.toHaveBeenCalled();
        });

        it('should allow access when user has the required permission', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(['read:units']);
            const context = mockExecutionContext({ id: 'user-123' });
            mockUsuariosRolesService.getUserPermissions.mockResolvedValue([
                { Id: 'perm-1', Nombre: 'read:units' },
                { Id: 'perm-2', Nombre: 'write:units' },
            ]);

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(mockUsuariosRolesService.getUserPermissions).toHaveBeenCalledWith('user-123');
        });

        it('should allow access when user has at least one of the required permissions', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(['read:units', 'admin:all']);
            const context = mockExecutionContext({ id: 'user-123' });
            mockUsuariosRolesService.getUserPermissions.mockResolvedValue([
                { Id: 'perm-1', Nombre: 'read:units' },
            ]);

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });

        it('should throw ForbiddenException when user does not have required permissions', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(['admin:all']);
            const context = mockExecutionContext({ id: 'user-123' });
            mockUsuariosRolesService.getUserPermissions.mockResolvedValue([
                { Id: 'perm-1', Nombre: 'read:units' },
            ]);

            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException when user has empty permissions list', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(['read:units']);
            const context = mockExecutionContext({ id: 'user-123' });
            mockUsuariosRolesService.getUserPermissions.mockResolvedValue([]);

            await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
        });

        it('should handle getUserPermissions throwing an error', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(['read:units']);
            const context = mockExecutionContext({ id: 'user-123' });
            mockUsuariosRolesService.getUserPermissions.mockRejectedValue(
                new Error('Database connection failed'),
            );

            await expect(guard.canActivate(context)).rejects.toThrow('Database connection failed');
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';
import { UnidadesQueryService } from './unidades-query.service';
import { UnidadesImportService } from './unidades-import.service';
import { AuthorizationService } from '../../auth/authorization/authorization.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../../common/guards/global-permissions.guard';
import { BruteForceGuard } from '../../common/guards/brute-force.guard';
import { BruteForceInterceptor } from '../../common/interceptors/brute-force.interceptor';

describe('UnidadesController', () => {
  let controller: UnidadesController;

  const mockUnidadesService = {
    create: jest.fn(),
    update: jest.fn(),
    updateComplete: jest.fn(),
    remove: jest.fn(),
    adjustPricesByProjects: jest.fn(),
  };

  const mockUnidadesQueryService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByIds: jest.fn(),
    getNaturalezas: jest.fn(),
    getTiposDisponibles: jest.fn(),
    getProyectosPorTipo: jest.fn(),
    getEtapas: jest.fn(),
    getTipos: jest.fn(),
    getSectores: jest.fn(),
  };

  const mockImportService = {
    importFromExcel: jest.fn(),
    importFromUrl: jest.fn(),
  };

  const mockAuthorizationService = {
    getUserProjects: jest.fn(),
    getUserProjectsDetailed: jest.fn(),
    getUserAccessInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnidadesController],
      providers: [
        { provide: UnidadesService, useValue: mockUnidadesService },
        { provide: UnidadesQueryService, useValue: mockUnidadesQueryService },
        { provide: UnidadesImportService, useValue: mockImportService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(GlobalPermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(BruteForceGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(BruteForceInterceptor)
      .useValue({ intercept: (context: any, next: any) => next.handle() })
      .compile();

    controller = module.get<UnidadesController>(UnidadesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  describe('getTipos', () => {
    it('should return types without validating project access', async () => {
      const mockUser = { id: 'user-id' };
      const project = 'Test Project';
      const etapa = 'Stage 1';
      const expectedTypes = ['Type A', 'Type B'];

      mockUnidadesQueryService.getTipos.mockResolvedValue(expectedTypes);
      // Mock admin user to skip project validation
      mockAuthorizationService.getUserAccessInfo.mockResolvedValue({
        UsuariosRoles: [{ Roles: { Nombre: 'superadminmv' } }]
      });
      // Ensure getUserProjectsDetailed is NOT called to verify we skipped validation
      mockAuthorizationService.getUserProjectsDetailed.mockClear();

      const result = await controller.getTipos(project, mockUser, etapa);

      expect(result).toBe(expectedTypes);
      expect(mockUnidadesQueryService.getTipos).toHaveBeenCalledWith(project, etapa);
      expect(mockAuthorizationService.getUserProjectsDetailed).not.toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

describe('ProyectosController', () => {
  let controller: ProyectosController;

  const mockProyectosService = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findByName: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProyectosController],
      providers: [
        {
          provide: ProyectosService,
          useValue: mockProyectosService,
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProyectosController>(ProyectosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

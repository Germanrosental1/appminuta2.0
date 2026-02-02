import { Test, TestingModule } from '@nestjs/testing';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../../common/guards/global-permissions.guard';

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
      .overrideGuard(GlobalPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProyectosController>(ProyectosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

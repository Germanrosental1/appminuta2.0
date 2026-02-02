import { Test, TestingModule } from '@nestjs/testing';
import { GastosgeneralesController } from './gastosgenerales.controller';
import { GastosgeneralesService } from './gastosgenerales.service';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

describe('GastosgeneralesController', () => {
  let controller: GastosgeneralesController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GastosgeneralesController],
      providers: [
        {
          provide: GastosgeneralesService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GastosgeneralesController>(GastosgeneralesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

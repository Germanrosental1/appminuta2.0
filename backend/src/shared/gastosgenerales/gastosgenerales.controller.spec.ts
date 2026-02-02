import { Test, TestingModule } from '@nestjs/testing';
import { GastosgeneralesController } from './gastosgenerales.controller';
import { GastosgeneralesService } from './gastosgenerales.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GlobalPermissionsGuard } from '../../common/guards/global-permissions.guard';

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
      .overrideGuard(GlobalPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GastosgeneralesController>(GastosgeneralesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

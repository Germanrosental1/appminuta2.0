import { Test, TestingModule } from '@nestjs/testing';
import { GastosgeneralesController } from './gastosgenerales.controller';

describe('GastosgeneralesController', () => {
  let controller: GastosgeneralesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GastosgeneralesController],
    }).compile();

    controller = module.get<GastosgeneralesController>(GastosgeneralesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

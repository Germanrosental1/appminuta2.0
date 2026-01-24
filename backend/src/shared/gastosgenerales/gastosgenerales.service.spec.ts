import { Test, TestingModule } from '@nestjs/testing';
import { GastosgeneralesService } from './gastosgenerales.service';

describe('GastosgeneralesService', () => {
  let service: GastosgeneralesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GastosgeneralesService],
    }).compile();

    service = module.get<GastosgeneralesService>(GastosgeneralesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

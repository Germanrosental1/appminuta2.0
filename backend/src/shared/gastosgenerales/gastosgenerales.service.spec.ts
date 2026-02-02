import { Test, TestingModule } from '@nestjs/testing';
import { GastosgeneralesService } from './gastosgenerales.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GastosgeneralesService', () => {
  let service: GastosgeneralesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GastosgeneralesService,
        {
          provide: PrismaService,
          useValue: {
            gastosGenerales: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<GastosgeneralesService>(GastosgeneralesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

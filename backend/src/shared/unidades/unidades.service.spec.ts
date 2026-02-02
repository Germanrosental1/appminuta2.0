import { Test, TestingModule } from '@nestjs/testing';
import { UnidadesService } from './unidades.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UnidadesService', () => {
  let service: UnidadesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnidadesService,
        {
          provide: PrismaService,
          useValue: {
            unidades: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            $transaction: jest.fn((cb) => cb(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<UnidadesService>(UnidadesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ProyectosService } from './proyectos.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProyectosService', () => {
  let service: ProyectosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProyectosService,
        {
          provide: PrismaService,
          useValue: {
            proyectos: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProyectosService>(ProyectosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

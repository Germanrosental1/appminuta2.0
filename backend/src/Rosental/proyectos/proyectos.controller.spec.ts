import { Test, TestingModule } from '@nestjs/testing';
import { ProyectosController } from './proyectos.controller';

describe('ProyectosController', () => {
  let controller: ProyectosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProyectosController],
    }).compile();

    controller = module.get<ProyectosController>(ProyectosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

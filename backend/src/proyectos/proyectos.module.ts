import { Module } from '@nestjs/common';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProyectoFactory } from './factories/proyecto.factory';

@Module({
  imports: [PrismaModule],
  controllers: [ProyectosController],
  providers: [ProyectosService, ProyectoFactory],
  exports: [ProyectosService, ProyectoFactory],
})
export class ProyectosModule { }

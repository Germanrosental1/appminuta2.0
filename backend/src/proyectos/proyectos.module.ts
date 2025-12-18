import { Module } from '@nestjs/common';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProyectoFactory } from './factories/proyecto.factory';
import { AuthorizationModule } from '../auth/authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [ProyectosController],
  providers: [ProyectosService, ProyectoFactory],
  exports: [ProyectosService, ProyectoFactory],
})
export class ProyectosModule { }

import { Module } from '@nestjs/common';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProyectoFactory } from './factories/proyecto.factory';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';

@Module({
  imports: [PrismaModule, UsuariosRolesModule],
  controllers: [ProyectosController],
  providers: [ProyectosService, ProyectoFactory],
  exports: [ProyectosService, ProyectoFactory],
})
export class ProyectosModule { }

import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';
import { UsuariosProyectosModule } from '../usuarios-proyectos/usuarios-proyectos.module';

@Module({
    imports: [UsuariosRolesModule, UsuariosProyectosModule],
    controllers: [UsuariosController],
})
export class UsuariosModule { }

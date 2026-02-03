import { Module } from '@nestjs/common';
import { UsuariosProyectosService } from './usuarios-proyectos.service';
import { PrismaModule } from '../../../prisma/prisma.module';

import { PermissionsCacheModule } from '../services/permissions-cache.module';

@Module({
    imports: [PrismaModule, PermissionsCacheModule],
    providers: [UsuariosProyectosService],
    exports: [UsuariosProyectosService],
})
export class UsuariosProyectosModule { }

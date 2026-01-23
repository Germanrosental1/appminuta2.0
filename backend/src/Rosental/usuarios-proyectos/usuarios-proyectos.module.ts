import { Module } from '@nestjs/common';
import { UsuariosProyectosService } from './usuarios-proyectos.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [UsuariosProyectosService],
    exports: [UsuariosProyectosService],
})
export class UsuariosProyectosModule { }

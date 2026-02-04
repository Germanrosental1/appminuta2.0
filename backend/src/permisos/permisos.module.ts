import { Module } from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { PermisosController } from './permisos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PermisosController],
    providers: [PermisosService],
    exports: [PermisosService],
})
export class PermisosModule { }

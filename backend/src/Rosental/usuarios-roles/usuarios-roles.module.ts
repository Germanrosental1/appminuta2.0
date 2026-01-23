import { Module } from '@nestjs/common';
import { UsuariosRolesService } from './usuarios-roles.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [UsuariosRolesService],
    exports: [UsuariosRolesService],
})
export class UsuariosRolesModule { }

import { Module } from '@nestjs/common';
import { UsuariosRolesService } from './usuarios-roles.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PermissionsCacheModule } from '../services/permissions-cache.module';

@Module({
    imports: [PrismaModule, PermissionsCacheModule],
    providers: [UsuariosRolesService],
    exports: [UsuariosRolesService],
})
export class UsuariosRolesModule { }

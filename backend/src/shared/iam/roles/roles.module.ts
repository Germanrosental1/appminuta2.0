import { Module, forwardRef } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';

import { PermissionsCacheModule } from '../services/permissions-cache.module';

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => UsuariosRolesModule), // 🔒 Para cache invalidation
        PermissionsCacheModule,
    ],
    controllers: [RolesController],
    providers: [RolesService],
    exports: [RolesService],
})
export class RolesModule { }

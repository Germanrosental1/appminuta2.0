import { Module, forwardRef } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => UsuariosRolesModule), // 🔒 Para cache invalidation
    ],
    controllers: [RolesController],
    providers: [RolesService],
    exports: [RolesService],
})
export class RolesModule { }

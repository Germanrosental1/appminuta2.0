import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseStrategy } from './supabase.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthLoggerService } from './auth-logger.service';
import { AuthLoggerController } from './auth-logger.controller';
import { GlobalPermissionsGuard } from '../common/guards/global-permissions.guard';
import { ProjectAccessGuard } from '../common/guards/project-access.guard';
import { MFAGuard } from '../common/guards/mfa.guard';
import { UsuariosRolesModule } from '../shared/iam/usuarios-roles/usuarios-roles.module';
import { UsuariosProyectosModule } from '../shared/iam/usuarios-proyectos/usuarios-proyectos.module';
import { LoggerModule } from '../logger/logger.module';

import { UifSupabaseStrategy } from './uif-supabase.strategy';
import { AuthorizationModule } from './authorization/authorization.module';

@Module({
    imports: [
        PassportModule,
        PrismaModule,
        UsuariosRolesModule,
        UsuariosProyectosModule,
        LoggerModule,
        AuthorizationModule,
    ],
    controllers: [AuthLoggerController],
    providers: [
        SupabaseStrategy,
        UifSupabaseStrategy,
        AuthLoggerService,
        GlobalPermissionsGuard,
        ProjectAccessGuard,
        MFAGuard,
    ],
    exports: [
        PassportModule,
        SupabaseStrategy,
        UifSupabaseStrategy,
        AuthLoggerService,
        GlobalPermissionsGuard,
        ProjectAccessGuard,
        MFAGuard,
    ],
})
export class AuthModule { }


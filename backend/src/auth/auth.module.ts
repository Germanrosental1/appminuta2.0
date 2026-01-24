import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseStrategy } from './supabase.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthLoggerService } from './auth-logger.service';
import { AuthLoggerController } from './auth-logger.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { MFAGuard } from './guards/mfa.guard';
import { UsuariosRolesModule } from '../shared/iam/usuarios-roles/usuarios-roles.module';
import { UsuariosProyectosModule } from '../shared/iam/usuarios-proyectos/usuarios-proyectos.module';
import { LoggerModule } from '../logger/logger.module';

import { UifSupabaseStrategy } from './uif-supabase.strategy';

@Module({
    imports: [
        PassportModule,
        PrismaModule,
        UsuariosRolesModule,
        UsuariosProyectosModule,
        LoggerModule,
    ],
    controllers: [AuthLoggerController],
    providers: [
        SupabaseStrategy,
        UifSupabaseStrategy,
        AuthLoggerService,
        PermissionsGuard,
        ProjectAccessGuard,
        MFAGuard,
    ],
    exports: [
        PassportModule,
        SupabaseStrategy,
        UifSupabaseStrategy,
        AuthLoggerService,
        PermissionsGuard,
        ProjectAccessGuard,
        MFAGuard,
    ],
})
export class AuthModule { }


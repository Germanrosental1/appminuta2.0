import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseStrategy } from './supabase.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthLoggerService } from './auth-logger.service';
import { AuthLoggerController } from './auth-logger.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';
import { UsuariosProyectosModule } from '../usuarios-proyectos/usuarios-proyectos.module';
import { AuthorizationModule } from './authorization/authorization.module';

@Module({
    imports: [
        PassportModule,
        PrismaModule,
        UsuariosRolesModule,
        UsuariosProyectosModule,
        AuthorizationModule,
    ],
    controllers: [AuthLoggerController],
    providers: [
        SupabaseStrategy,
        AuthLoggerService,
        PermissionsGuard,
        ProjectAccessGuard,
    ],
    exports: [
        PassportModule,
        SupabaseStrategy,
        AuthLoggerService,
        PermissionsGuard,
        ProjectAccessGuard,
    ],
})
export class AuthModule { }

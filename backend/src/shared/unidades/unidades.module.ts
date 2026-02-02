import { Module } from '@nestjs/common';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';
import { UnidadesQueryService } from './unidades-query.service';
import { UnidadesImportService } from './unidades-import.service';
import { BruteForceInterceptor } from '../../common/interceptors/brute-force.interceptor';
import { PrismaModule } from '../../prisma/prisma.module';
import { BruteForceGuard } from '../../auth/guards/brute-force.guard';
import { UsuariosRolesModule } from '../iam/usuarios-roles/usuarios-roles.module';
import { LoggerModule } from '../../logger/logger.module';
import { AuthorizationModule } from '../../auth/authorization/authorization.module';

@Module({
  imports: [PrismaModule, UsuariosRolesModule, LoggerModule, AuthorizationModule],
  controllers: [UnidadesController],
  providers: [UnidadesService, UnidadesQueryService, UnidadesImportService, BruteForceGuard, BruteForceInterceptor],
  exports: [UnidadesService, UnidadesQueryService]
})
export class UnidadesModule { }

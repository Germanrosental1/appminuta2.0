import { Module } from '@nestjs/common';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';
import { UnidadesQueryService } from './unidades-query.service';
import { UnidadesImportService } from './unidades-import.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [PrismaModule, UsuariosRolesModule, LoggerModule],
  controllers: [UnidadesController],
  providers: [UnidadesService, UnidadesQueryService, UnidadesImportService],
  exports: [UnidadesService, UnidadesQueryService]
})
export class UnidadesModule { }

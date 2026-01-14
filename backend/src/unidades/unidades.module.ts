import { Module } from '@nestjs/common';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';
import { UnidadesImportService } from './unidades-import.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsuariosRolesModule } from '../usuarios-roles/usuarios-roles.module';

@Module({
  imports: [PrismaModule, UsuariosRolesModule],
  controllers: [UnidadesController],
  providers: [UnidadesService, UnidadesImportService],
  exports: [UnidadesService]
})
export class UnidadesModule { }

import { Module } from '@nestjs/common';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';
import { UnidadesQueryService } from './unidades-query.service';
import { UnidadesImportService } from './unidades-import.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UnidadesController],
  providers: [UnidadesService, UnidadesQueryService, UnidadesImportService],
  exports: [UnidadesService, UnidadesQueryService]
})
export class UnidadesModule { }

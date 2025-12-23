import { Module } from '@nestjs/common';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';
import { UnidadesImportService } from './unidades-import.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UnidadesController],
  providers: [UnidadesService, UnidadesImportService],
  exports: [UnidadesService]
})
export class UnidadesModule { }

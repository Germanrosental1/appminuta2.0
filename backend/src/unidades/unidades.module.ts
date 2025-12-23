import { Module } from '@nestjs/common';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UnidadesController],
  providers: [UnidadesService]
})
export class UnidadesModule { }

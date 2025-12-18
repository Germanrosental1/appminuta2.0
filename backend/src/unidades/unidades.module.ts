import { Module } from '@nestjs/common';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../auth/authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [UnidadesController],
  providers: [UnidadesService],
  exports: [UnidadesService],
})
export class UnidadesModule { }

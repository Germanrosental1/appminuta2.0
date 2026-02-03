import { Module } from '@nestjs/common';
import { GastosgeneralesController } from './gastosgenerales.controller';
import { GastosgeneralesService } from './gastosgenerales.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GastosgeneralesController],
  providers: [GastosgeneralesService]
})
export class GastosgeneralesModule { }

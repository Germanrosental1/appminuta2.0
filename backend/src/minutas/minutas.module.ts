import { Module } from '@nestjs/common';
import { MinutasService } from './minutas.service';
import { MinutasController } from './minutas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MinutasController],
  providers: [MinutasService],
})
export class MinutasModule { }

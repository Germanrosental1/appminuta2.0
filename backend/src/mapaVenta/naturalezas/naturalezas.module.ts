import { Module } from '@nestjs/common';
import { NaturalezasService } from './naturalezas.service';
import { NaturalezasController } from './naturalezas.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [NaturalezasController],
    providers: [NaturalezasService],
    exports: [NaturalezasService],
})
export class NaturalezasModule { }

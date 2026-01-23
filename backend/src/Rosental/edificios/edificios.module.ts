import { Module } from '@nestjs/common';
import { EdificiosService } from './edificios.service';
import { EdificiosController } from './edificios.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [EdificiosController],
    providers: [EdificiosService],
    exports: [EdificiosService],
})
export class EdificiosModule { }

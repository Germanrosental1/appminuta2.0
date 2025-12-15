import { Module } from '@nestjs/common';
import { TiposCocheraService } from './tiposcochera.service';
import { TiposCocheraController } from './tiposcochera.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TiposCocheraController],
    providers: [TiposCocheraService],
    exports: [TiposCocheraService],
})
export class TiposCocheraModule { }

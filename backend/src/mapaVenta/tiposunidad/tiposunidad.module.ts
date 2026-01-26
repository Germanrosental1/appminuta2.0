import { Module } from '@nestjs/common';
import { TiposUnidadService } from './tiposunidad.service';
import { TiposUnidadController } from './tiposunidad.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TiposUnidadController],
    providers: [TiposUnidadService],
    exports: [TiposUnidadService],
})
export class TiposUnidadModule { }

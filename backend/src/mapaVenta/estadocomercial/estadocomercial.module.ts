import { Module } from '@nestjs/common';
import { EstadoComercialService } from './estadocomercial.service';
import { EstadoComercialController } from './estadocomercial.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [EstadoComercialController],
    providers: [EstadoComercialService],
    exports: [EstadoComercialService],
})
export class EstadoComercialModule { }

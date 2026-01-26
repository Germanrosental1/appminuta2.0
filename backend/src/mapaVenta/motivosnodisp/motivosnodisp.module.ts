import { Module } from '@nestjs/common';
import { MotivosNodispService } from './motivosnodisp.service';
import { MotivosNodispController } from './motivosnodisp.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MotivosNodispController],
    providers: [MotivosNodispService],
    exports: [MotivosNodispService],
})
export class MotivosNodispModule { }

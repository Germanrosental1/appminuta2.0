import { Module } from '@nestjs/common';
import { TiposPatioTerrazaService } from './tipospatioterraza.service';
import { TiposPatioTerrazaController } from './tipospatioterraza.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TiposPatioTerrazaController],
    providers: [TiposPatioTerrazaService],
    exports: [TiposPatioTerrazaService],
})
export class TiposPatioTerrazaModule { }

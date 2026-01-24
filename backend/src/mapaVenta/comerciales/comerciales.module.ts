import { Module } from '@nestjs/common';
import { ComercialesService } from './comerciales.service';
import { ComercialesController } from './comerciales.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ComercialesController],
    providers: [ComercialesService],
    exports: [ComercialesService],
})
export class ComercialesModule { }

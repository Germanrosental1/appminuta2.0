import { Global, Module } from '@nestjs/common';
import { PrismaUifService } from './prisma-uif.service';

@Global()
@Module({
    providers: [PrismaUifService],
    exports: [PrismaUifService],
})
export class PrismaUifModule { }

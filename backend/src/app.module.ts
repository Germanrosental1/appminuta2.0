import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MinutasModule } from './minutas/minutas.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { UnidadesModule } from './unidades/unidades.module';

import { AuthModule } from './auth/auth.module';

@Module({
    imports: [AuthModule, PrismaModule, MinutasModule, ProyectosModule, UnidadesModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }

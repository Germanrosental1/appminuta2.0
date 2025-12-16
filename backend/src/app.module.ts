import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MinutasModule } from './minutas/minutas.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { UnidadesModule } from './unidades/unidades.module';
import { RolesModule } from './roles/roles.module';
import { PermisosModule } from './permisos/permisos.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { UsuariosRolesModule } from './usuarios-roles/usuarios-roles.module';
import { UsuariosProyectosModule } from './usuarios-proyectos/usuarios-proyectos.module';

// Catalog modules
import { ComercialesModule } from './comerciales/comerciales.module';
import { EtapasModule } from './etapas/etapas.module';
import { EstadoComercialModule } from './estadocomercial/estadocomercial.module';
import { MotivosNodispModule } from './motivosnodisp/motivosnodisp.module';
import { NaturalezasModule } from './naturalezas/naturalezas.module';
import { TiposCocheraModule } from './tiposcochera/tiposcochera.module';
import { TiposPatioTerrazaModule } from './tipospatioterraza/tipospatioterraza.module';
import { TiposUnidadModule } from './tiposunidad/tiposunidad.module';

// Business modules
import { EdificiosModule } from './edificios/edificios.module';

import { AuthModule } from './auth/auth.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [
        AuthModule,
        PrismaModule,
        MinutasModule,
        ProyectosModule,
        UnidadesModule,
        RolesModule,
        PermisosModule,
        UsuariosModule,
        UsuariosRolesModule,
        UsuariosProyectosModule,
        // Catalog modules
        ComercialesModule,
        EtapasModule,
        EstadoComercialModule,
        MotivosNodispModule,
        NaturalezasModule,
        TiposCocheraModule,
        TiposPatioTerrazaModule,
        TiposUnidadModule,
        // Business modules
        EdificiosModule,
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }

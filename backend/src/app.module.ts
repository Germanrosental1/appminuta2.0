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

import { LoggerModule } from './logger/logger.module';

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
import { ClientesModule } from './clientes/clientes.module';


import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingThrottlerGuard } from './common/guards/logging-throttler.guard';
import { PrismaRetryInterceptor } from './common/interceptors/prisma-retry.interceptor';
// ⚡ OPTIMIZACIÓN: Cache para catálogos con soporte Redis
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { GastosgeneralesModule } from './gastosgenerales/gastosgenerales.module';

// ⚡ Factory para configuración de cache (Redis o memoria)
const getCacheConfig = (): any => {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
        // Producción: Usar Redis para cache distribuido
        console.log('⚡ Cache: Using Redis store');
        return {
            store: redisStore,
            url: redisUrl,
            ttl: 300, // 5 minutos en segundos
            max: 100,
        };
    }

    // Desarrollo: Cache en memoria
    console.log('⚡ Cache: Using in-memory store (set REDIS_URL for production)');
    return {
        ttl: 300000, // 5 minutos en ms
        max: 100,
    };
};

@Module({
    imports: [
        // ⚡ OPTIMIZACIÓN: Cache global con soporte Redis
        CacheModule.registerAsync({
            useFactory: getCacheConfig,
            isGlobal: true,
        }),
        AuthModule,
        PrismaModule,
        LoggerModule,
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
        ClientesModule,
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        GastosgeneralesModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: LoggingThrottlerGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: PrismaRetryInterceptor,
        },
    ],
})
export class AppModule { }

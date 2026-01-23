import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingThrottlerGuard } from './common/guards/logging-throttler.guard';
import { PrismaRetryInterceptor } from './common/interceptors/prisma-retry.interceptor';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { ScheduleModule } from '@nestjs/schedule';

// ==========================================
// ROSENTAL MODULES (moved to ./Rosental/)
// ==========================================
import { MinutasModule } from './Rosental/minutas/minutas.module';
import { ProyectosModule } from './Rosental/proyectos/proyectos.module';
import { UnidadesModule } from './Rosental/unidades/unidades.module';
import { RolesModule } from './Rosental/roles/roles.module';
import { PermisosModule } from './Rosental/permisos/permisos.module';
import { UsuariosModule } from './Rosental/usuarios/usuarios.module';
import { UsuariosRolesModule } from './Rosental/usuarios-roles/usuarios-roles.module';
import { UsuariosProyectosModule } from './Rosental/usuarios-proyectos/usuarios-proyectos.module';
import { SnapshotsModule } from './Rosental/snapshots/snapshots.module';
// Catalog modules
import { ComercialesModule } from './Rosental/comerciales/comerciales.module';
import { EtapasModule } from './Rosental/etapas/etapas.module';
import { EstadoComercialModule } from './Rosental/estadocomercial/estadocomercial.module';
import { MotivosNodispModule } from './Rosental/motivosnodisp/motivosnodisp.module';
import { NaturalezasModule } from './Rosental/naturalezas/naturalezas.module';
import { TiposCocheraModule } from './Rosental/tiposcochera/tiposcochera.module';
import { TiposPatioTerrazaModule } from './Rosental/tipospatioterraza/tipospatioterraza.module';
import { TiposUnidadModule } from './Rosental/tiposunidad/tiposunidad.module';
// Business modules
import { EdificiosModule } from './Rosental/edificios/edificios.module';
import { ClientesModule } from './Rosental/clientes/clientes.module';
import { GastosgeneralesModule } from './Rosental/gastosgenerales/gastosgenerales.module';

// ==========================================
// UIF MODULES
// ==========================================
import { PrismaUifModule } from './prisma-uif/prisma-uif.module';
import { UifModule } from './uif/uif.module';

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
        // Core modules (shared)
        AuthModule,
        PrismaModule,
        LoggerModule,
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        ScheduleModule.forRoot(),

        // ==========================================
        // ROSENTAL MODULES
        // ==========================================
        MinutasModule,
        ProyectosModule,
        UnidadesModule,
        RolesModule,
        PermisosModule,
        UsuariosModule,
        UsuariosRolesModule,
        UsuariosProyectosModule,
        SnapshotsModule,
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
        GastosgeneralesModule,

        // UIF Modules
        PrismaUifModule,
        UifModule,
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

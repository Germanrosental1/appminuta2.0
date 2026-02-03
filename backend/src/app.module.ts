import { Module, MiddlewareConsumer, RequestMethod, NestModule } from '@nestjs/common';
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
import { MobileBlockerMiddleware } from './common/middleware/mobile-blocker.middleware';

// ==========================================
// MAPA VENTA MODULES (moved to ./mapaVenta/)
// ==========================================
import { MinutasModule } from './minutas/minutas.module';
import { ProyectosModule } from './shared/proyectos/proyectos.module';
import { UnidadesModule } from './shared/unidades/unidades.module';
import { RolesModule } from './shared/iam/roles/roles.module';
import { PermisosModule } from './shared/iam/permisos/permisos.module';
import { UsuariosModule } from './shared/iam/usuarios/usuarios.module';
import { UsuariosRolesModule } from './shared/iam/usuarios-roles/usuarios-roles.module';
import { UsuariosProyectosModule } from './shared/iam/usuarios-proyectos/usuarios-proyectos.module';
import { SnapshotsModule } from './mapaVenta/snapshots/snapshots.module';
// Catalog modules
import { ComercialesModule } from './mapaVenta/comerciales/comerciales.module';
import { EtapasModule } from './mapaVenta/etapas/etapas.module';
import { EstadoComercialModule } from './mapaVenta/estadocomercial/estadocomercial.module';
import { MotivosNodispModule } from './mapaVenta/motivosnodisp/motivosnodisp.module';
import { NaturalezasModule } from './mapaVenta/naturalezas/naturalezas.module';
import { TiposCocheraModule } from './mapaVenta/tiposcochera/tiposcochera.module';
import { TiposPatioTerrazaModule } from './mapaVenta/tipospatioterraza/tipospatioterraza.module';
import { TiposUnidadModule } from './mapaVenta/tiposunidad/tiposunidad.module';
// Business modules
import { EdificiosModule } from './mapaVenta/edificios/edificios.module';
import { ClientesModule } from './minutas/modules/clientes/clientes.module';
import { GastosgeneralesModule } from './shared/gastosgenerales/gastosgenerales.module';

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
        ThrottlerModule.forRoot([
            // 🔒 V-004 FIX: Límite global para prevenir DoS distribuido vía múltiples cuentas
            {
                name: 'global',
                ttl: 60000,
                limit: 200, // Máximo 200 req/min para el servidor
            },
            // Límite por usuario (existente)
            {
                name: 'per-user',
                ttl: 60000,
                limit: 100,
            }
        ]),
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
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(MobileBlockerMiddleware)
            .forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}

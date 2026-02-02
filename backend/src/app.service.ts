import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { MinutasService } from './minutas/minutas.service';

export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    database: {
        connected: boolean;
        latencyMs?: number;
    };
    memory: {
        heapUsedMB: number;
        heapTotalMB: number;
        rssMB: number;
        // ⚡ M-005: Porcentaje de uso del heap para alertas
        heapUsagePercent: number;
    };
    // ⚡ M-005: Estadísticas de caches en memoria
    caches: {
        permissionsCache: {
            size: number;
            maxSize: number;
            utilizationPercent: number;
        };
    };
}

@Injectable()
export class AppService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly minutasService: MinutasService,
    ) { }

    getHello(): string {
        return 'Hello World From Enterprise Backend!';
    }

    async getHealthCheck(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        let dbConnected = false;
        let dbLatency: number | undefined;

        // Test database connectivity
        try {
            const dbStart = Date.now();
            await this.prisma.$queryRaw`SELECT 1`;
            dbLatency = Date.now() - dbStart;
            dbConnected = true;
        } catch {
            dbConnected = false;
        }

        // Memory metrics
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

        // ⚡ M-005: Obtener estadísticas de caches
        const permissionsCacheStats = this.minutasService.getPermissionsCacheStats();

        return {
            status: dbConnected ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                connected: dbConnected,
                latencyMs: dbLatency,
            },
            memory: {
                heapUsedMB,
                heapTotalMB,
                rssMB: Math.round(memUsage.rss / 1024 / 1024),
                // ⚡ M-005: Porcentaje de uso para alertas (basado en límite de 600MB)
                heapUsagePercent: Math.round((heapUsedMB / 600) * 100),
            },
            // ⚡ M-005: Estadísticas de caches para monitoring
            caches: {
                permissionsCache: permissionsCacheStats,
            },
        };
    }
}

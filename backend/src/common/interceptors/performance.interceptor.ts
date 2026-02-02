import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// ⚡ MONITORING: Simple in-memory metrics store
interface EndpointMetrics {
    count: number;
    totalDuration: number;
    maxDuration: number;
    minDuration: number;
    slowRequests: number; // > 1000ms
}

const metricsStore = new Map<string, EndpointMetrics>();
// ⚡ M-002: Límite máximo de entradas para evitar memory leaks
const MAX_METRICS_ENTRIES = 1000;

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
    private readonly logger = new Logger(PerformanceInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        const start = Date.now();
        const startMemory = process.memoryUsage().heapUsed;

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - start;
                const endMemory = process.memoryUsage().heapUsed;
                const memoryDelta = Math.round((endMemory - startMemory) / 1024); // KB

                // Update metrics
                this.updateMetrics(method, url, duration);

                // Logging based on duration thresholds
                if (duration > 1000) {
                    this.logger.warn(
                        `SLOW ${method} ${url} - ${duration}ms | Memory: +${memoryDelta}KB`
                    );
                } else if (duration > 500) {
                    this.logger.log(
                        `${method} ${url} - ${duration}ms | Memory: +${memoryDelta}KB`
                    );
                } else {
                    this.logger.debug(`${method} ${url} - ${duration}ms`);
                }
            }),
        );
    }

    private updateMetrics(method: string, url: string, duration: number): void {
        // Normalize URL to remove query params and IDs for grouping
        const normalizedUrl = this.normalizeUrl(url);
        const key = `${method} ${normalizedUrl}`;

        // Evict oldest entry if at capacity before adding new one
        if (metricsStore.size >= MAX_METRICS_ENTRIES && !metricsStore.has(key)) {
            const firstKey = metricsStore.keys().next().value;
            if (firstKey) metricsStore.delete(firstKey);
        }

        const existing = metricsStore.get(key) || {
            count: 0,
            totalDuration: 0,
            maxDuration: 0,
            minDuration: Infinity,
            slowRequests: 0,
        };

        existing.count++;
        existing.totalDuration += duration;
        existing.maxDuration = Math.max(existing.maxDuration, duration);
        existing.minDuration = Math.min(existing.minDuration, duration);
        if (duration > 1000) existing.slowRequests++;

        metricsStore.set(key, existing);
    }

    private normalizeUrl(url: string): string {
        // Remove query params
        const urlWithoutQuery = url.split('?')[0];
        // Replace UUIDs with :id
        return urlWithoutQuery.replace(
            /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
            ':id'
        );
    }

    /**
     * Get current metrics for monitoring endpoints
     */
    static getMetrics(): Record<string, EndpointMetrics & { avgDuration: number }> {
        const result: Record<string, EndpointMetrics & { avgDuration: number }> = {};

        for (const [key, metrics] of metricsStore.entries()) {
            result[key] = {
                ...metrics,
                avgDuration: Math.round(metrics.totalDuration / metrics.count),
                minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
            };
        }

        return result;
    }

    /**
     * Reset metrics (useful for testing or periodic resets)
     */
    static resetMetrics(): void {
        metricsStore.clear();
    }
}

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createHash } from 'node:crypto';

/**
 * ⚡ NETWORK OPTIMIZATION: ETag interceptor for HTTP cache validation
 *
 * Adds ETag headers to GET responses for client-side caching.
 * If client sends If-None-Match with matching ETag, returns 304 Not Modified.
 */
@Injectable()
export class EtagInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Only apply to GET requests
        if (request.method !== 'GET') {
            return next.handle();
        }

        return next.handle().pipe(
            map((data) => {
                // Skip if no data or non-JSON responses
                if (data === undefined || data === null) {
                    return data;
                }

                // Generate ETag from response body
                const etag = this.generateEtag(data);
                const clientEtag = request.headers['if-none-match'];

                // Check if client has fresh copy
                if (clientEtag && clientEtag === etag) {
                    response.status(304);
                    return null;
                }

                // Set ETag and cache headers
                response.setHeader('ETag', etag);
                response.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');

                return data;
            }),
        );
    }

    private generateEtag(data: unknown): string {
        const content = JSON.stringify(data);
        const hash = createHash('md5').update(content).digest('hex');
        return `"${hash}"`;
    }
}

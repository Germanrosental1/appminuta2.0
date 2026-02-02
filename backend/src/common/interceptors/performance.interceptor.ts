import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
    private readonly logger = new Logger(PerformanceInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        const start = Date.now();

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - start;
                if (duration > 1000) {
                    this.logger.warn(`SLOW ${method} ${url} - ${duration}ms`);
                } else if (duration > 500) {
                    this.logger.log(`${method} ${url} - ${duration}ms`);
                } else {
                    this.logger.debug(`${method} ${url} - ${duration}ms`);
                }
            }),
        );
    }
}

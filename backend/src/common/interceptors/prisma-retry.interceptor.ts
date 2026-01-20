import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap } from 'rxjs/operators';

@Injectable()
export class PrismaRetryInterceptor implements NestInterceptor {
    private readonly logger = new Logger(PrismaRetryInterceptor.name);
    private readonly maxRetries = 3;

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            retryWhen((errors) =>
                errors.pipe(
                    mergeMap((error, index) => {
                        const retryAttempt = index + 1;
                        if (
                            retryAttempt <= this.maxRetries &&
                            this.isConnectionError(error)
                        ) {
                            this.logger.warn(
                                `Database connection error, retry ${retryAttempt}/${this.maxRetries}: ${error.message}`,
                            );
                            return timer(1000 * retryAttempt);
                        }
                        return throwError(() => error);
                    }),
                ),
            ),
        );
    }

    private isConnectionError(error: any): boolean {
        return (
            error.message?.includes('Server has closed the connection') ||
            error.message?.includes('Connection pool timeout') ||
            error.message?.includes("Can't reach database server") ||
            error.code === 'P1001' || // Can't reach database server
            error.code === 'P1002' || // Database server timeout
            error.code === 'P1017'    // Server has closed the connection
        );
    }
}

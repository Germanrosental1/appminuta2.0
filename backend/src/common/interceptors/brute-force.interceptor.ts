import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BruteForceGuard } from '../../auth/guards/brute-force.guard';

/**
 * Interceptor para registrar intentos fallidos en BruteForceGuard
 * Se usa en conjunto con @UseGuards(BruteForceGuard)
 */
@Injectable()
export class BruteForceInterceptor implements NestInterceptor {
    constructor(private readonly bruteForceGuard: BruteForceGuard) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            catchError(async (err) => {
                const request = context.switchToHttp().getRequest();

                // Solo contar como intento fallido si es una excepción HTTP (4xx, 5xx)
                // O si es un error no controlado
                await this.bruteForceGuard.recordFailedAttempt(request);

                throw err;
            }),
        );
    }
}

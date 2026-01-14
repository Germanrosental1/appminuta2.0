/**
 * 🔒 SEGURIDAD: Servicio de logging seguro con redacción de datos sensibles
 * Parte de las mejoras de seguridad para alcanzar 10/10
 */
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class SecureLoggerService implements NestLoggerService {
    private readonly sensitiveFields = [
        'password', 'token', 'authorization', 'cookie',
        'dni', 'email', 'telefono', 'creditcard', 'credit_card',
        'secret', 'apikey', 'api_key', 'bearer', 'session',
        'clave', 'contraseña', 'tarjeta', 'cvv', 'pin'
    ];

    private readonly isProduction = process.env.NODE_ENV === 'production';

    /**
     * Redacta campos sensibles de un objeto recursivamente
     */
    private redactSensitive(obj: any, depth = 0): any {
        // Prevenir recursión infinita
        if (depth > 10) return '[MAX_DEPTH]';

        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'string') {
            // Redactar emails en strings
            return obj.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]');
        }

        if (typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
            return obj.map(item => this.redactSensitive(item, depth + 1));
        }

        const redacted: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
            const lowerKey = key.toLowerCase();
            if (this.sensitiveFields.some(f => lowerKey.includes(f))) {
                redacted[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
                redacted[key] = this.redactSensitive(obj[key], depth + 1);
            } else if (typeof obj[key] === 'string') {
                // Redactar emails en valores string
                redacted[key] = obj[key].replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]');
            } else {
                redacted[key] = obj[key];
            }
        }
        return redacted;
    }

    /**
     * Formatea mensaje para logging estructurado
     */
    private formatMessage(level: string, message: any, context?: string): string {
        return JSON.stringify({
            level,
            timestamp: new Date().toISOString(),
            context: context || 'Application',
            message: this.redactSensitive(message),
        });
    }

    log(message: any, context?: string): void {
        console.log(this.formatMessage('info', message, context));
    }

    error(message: any, trace?: string, context?: string): void {
        const logData: any = {
            level: 'error',
            timestamp: new Date().toISOString(),
            context: context || 'Application',
            message: this.redactSensitive(message),
        };

        // Solo incluir stack trace en desarrollo
        if (!this.isProduction && trace) {
            logData.trace = trace;
        }

        console.error(JSON.stringify(logData));
    }

    warn(message: any, context?: string): void {
        console.warn(this.formatMessage('warn', message, context));
    }

    debug(message: any, context?: string): void {
        if (!this.isProduction) {
            console.debug(this.formatMessage('debug', message, context));
        }
    }

    verbose(message: any, context?: string): void {
        if (!this.isProduction) {
            console.log(this.formatMessage('verbose', message, context));
        }
    }
}

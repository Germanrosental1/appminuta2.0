// Build: 2026-01-29T11:22
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { CsrfInterceptor } from './common/interceptors/csrf.interceptor';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { EtagInterceptor } from './common/interceptors/etag.interceptor';
import { validateEnv } from './config/env.validation';
import { setupSwagger } from './config/swagger.config';

// Polyfill for BigInt serialization
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

async function bootstrap() {
    // 🔒 S-002: Validar entorno antes de iniciar
    validateEnv();

    const app = await NestFactory.create(AppModule);

    // Headers de seguridad con Helmet (MEJORADO para 10/10)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    app.use(helmet({
        contentSecurityPolicy: isDevelopment ? false : {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Para estilos inline necesarios
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", "ws:", "wss:"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        hsts: {
            maxAge: 31536000, // 1 año
            includeSubDomains: true,
            preload: true,
        },
        frameguard: {
            action: 'deny', // Prevenir clickjacking
        },
        noSniff: true, // X-Content-Type-Options: nosniff
        xssFilter: true, // X-XSS-Protection: 1; mode=block
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin',
        },
        // 🔒 NUEVOS HEADERS DE SEGURIDAD (mejoras 10/10)
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'same-origin' },
        originAgentCluster: true,
    }));

    // Permissions-Policy header (no incluido en Helmet)
    app.use((req: any, res: any, next: any) => {
        res.setHeader(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
        );
        next();
    });

    // Comprimir respuestas HTTP (reduce 60-70% el tamaño)
    app.use(compression());

    // Cookie parser para CSRF tokens
    app.use(cookieParser());

    // 🔒 V-006 FIX: Limitar tamaño de payload para prevenir DoS
    // ⚡ PERFORMANCE: Reduced from 5MB to 1MB for faster parsing
    const expressApp = app.getHttpAdapter().getInstance();
    const bodyParser = require('express');
    app.use(bodyParser.json({ limit: '1mb' }));
    app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));

    // Trust Vercel Proxy
    expressApp.set('trust proxy', 1);

    // Deshabilitar header X-Powered-By
    expressApp.disable('x-powered-by');


    // Global Exception Filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // Enable Global Validation Pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false, // Permitir propiedades extra (se ignoran)
        transform: true,
        // Debug: Mostrar errores detallados
        exceptionFactory: (errors) => {
            const messages = errors.map(err =>
                `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`
            );
            console.error('Validation errors:', messages);
            return new (require('@nestjs/common').BadRequestException)(messages);
        },
    }));

    // API Response Wrapper - DEBE IR PRIMERO para wrappear correctamente
    const { ApiResponseInterceptor } = require('./common/interceptors/api-response.interceptor');
    app.useGlobalInterceptors(new ApiResponseInterceptor());

    // CSRF Protection
    app.useGlobalInterceptors(new CsrfInterceptor());

    // ⚡ PERFORMANCE: Log request duration and track metrics
    app.useGlobalInterceptors(new PerformanceInterceptor());

    // ⚡ NETWORK: ETag support for cache validation
    app.useGlobalInterceptors(new EtagInterceptor());

    // Swagger/OpenAPI Documentation
    // Solo en desarrollo o si está explícitamente habilitado
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
        setupSwagger(app);
    }

    // Configuración de CORS restrictiva
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction
        ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
        : [
            'https://localhost:8080',
            'https://localhost:8081',
            'https://localhost:5173',
            'https://localhost:3000',
        ];

    app.enableCors({
        origin: (origin, callback) => {
            // 🔒 Server-to-Server requests (como n8n, Mobile Apps, Postman) a menudo no envían Origin
            // O envían User-Agents como axios/curl.
            // Permitimos requests sin Origin explícito, delegando la seguridad a la autenticación (JWT).
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn(`CORS blocked origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        maxAge: 3600,
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Application is running on port: ${port}`);
    console.log(`Security headers enabled with Helmet`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}

// Bootstrap application
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap().catch((err) => {
    console.error('Error during application bootstrap:', err);
    process.exit(1);
});

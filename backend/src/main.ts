import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

// Polyfill for BigInt serialization
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Trust Vercel Proxy
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', 1);

    // Global Exception Filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // Enable Global Validation Pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    // Configuración de CORS restrictiva
    app.enableCors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:5173',
            'http://localhost:3000',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 3600,
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Application is running on port: ${port}`);
}

// Bootstrap application
void bootstrap().catch((err) => {
    console.error('Error during application bootstrap:', err);
    process.exit(1);
});

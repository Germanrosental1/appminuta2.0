import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// Polyfill for BigInt serialization
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Trust Vercel Proxy
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', 1);

    // Enable Global Validation Pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true, // properties not in DTO are stripped
        transform: true, // auto-transform payloads to DTO instances
    }));

    // Enable CORS so the React frontend can talk to us
    app.enableCors();
    await app.listen(process.env.PORT || 3000);
}
bootstrap();

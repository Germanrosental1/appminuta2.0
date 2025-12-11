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
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    // Enable CORS so the React frontend can talk to us
    app.enableCors();

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Application is running on port: ${port}`);
}

// Top-level await is not supported with CommonJS modules
// NOSONAR: typescript:S6544 - Cannot use top-level await with module: commonjs
void bootstrap().catch((err) => {
    console.error('Error during application bootstrap:', err);
    process.exit(1);
});

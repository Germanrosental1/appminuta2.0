import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-uif';

@Injectable()
export class PrismaUifService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaUifService.name);
    private readonly maxRetries = 5;
    private readonly retryDelay = 3000;

    constructor() {
        const databaseUrl = process.env.UIF_DATABASE_URL || '';

        // Agregar parámetros de connection pool
        const connectionPoolUrl = databaseUrl.includes('?')
            ? `${databaseUrl}&connection_limit=5&pool_timeout=30&connect_timeout=30`
            : `${databaseUrl}?connection_limit=5&pool_timeout=30&connect_timeout=30`;

        super({
            datasources: {
                db: { url: connectionPoolUrl },
            },
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        });
    }

    async onModuleInit() {
        await this.connectWithRetry();
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('UIF Database connection closed');
    }

    private async connectWithRetry(attempt = 1): Promise<void> {
        try {
            await this.$connect();
            this.logger.log('UIF Database connection established successfully');
        } catch (error: unknown) {
            this.logger.warn(
                `UIF DB connection attempt ${attempt}/${this.maxRetries} failed: ${error instanceof Error ? error.message : String(error)}`
            );

            if (attempt < this.maxRetries) {
                this.logger.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
                return this.connectWithRetry(attempt + 1);
            }

            this.logger.error(
                'Failed to connect to UIF database after maximum retries. Starting without UIF DB connection.'
            );
        }
    }
}

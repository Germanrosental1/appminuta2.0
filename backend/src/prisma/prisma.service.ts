import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger(PrismaService.name);
    private readonly maxRetries = 5;
    private readonly retryDelay = 3000; // 3 seconds

    async onModuleInit() {
        await this.connectWithRetry();
    }

    private async connectWithRetry(attempt = 1): Promise<void> {
        try {
            await this.$connect();
            this.logger.log('Database connection established successfully');
        } catch (error) {
            this.logger.warn(
                `Database connection attempt ${attempt}/${this.maxRetries} failed: ${error.message}`
            );

            if (attempt < this.maxRetries) {
                this.logger.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
                return this.connectWithRetry(attempt + 1);
            }

            this.logger.error(
                'Failed to connect to database after maximum retries. Starting without DB connection.'
            );
            // Don't throw - let the app start anyway
            // Individual queries will fail with proper error messages
        }
    }
}

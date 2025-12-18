import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger(PrismaService.name);
    private readonly maxRetries = 5;
    private readonly retryDelay = 3000; // 3 seconds

    constructor() {
        super({
            // ⚡ OPTIMIZATION: Connection pool settings
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
            log: process.env.NODE_ENV === 'development'
                ? ['warn', 'error']
                : ['error'],
        });
    }

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
        }
    }

    // ⚡ OPTIMIZATION: Método para ejecutar updates rápidos con raw SQL
    async executeRawUpdate(
        table: string,
        id: string,
        data: Record<string, any>,
        version: number
    ): Promise<number> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                setClauses.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (setClauses.length === 0) {
            return 0;
        }

        // Add version increment and updated_at
        setClauses.push(`version = version + 1`);
        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE ${table}
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}::uuid AND version = $${paramIndex + 1}
        `;

        values.push(id, version);

        const result = await this.$executeRawUnsafe(query, ...values);
        return result;
    }
}

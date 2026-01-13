import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private readonly maxRetries = 5;
    private readonly retryDelay = 3000; // 3 seconds
    private isConnected = false;

    constructor() {
        // Construir URL con parámetros de connection pool para Railway/Supabase
        const databaseUrl = process.env.DATABASE_URL || '';
        const connectionPoolUrl = databaseUrl.includes('?')
            ? `${databaseUrl}&connection_limit=10&pool_timeout=30&connect_timeout=30`
            : `${databaseUrl}?connection_limit=10&pool_timeout=30&connect_timeout=30`;

        super({
            datasources: {
                db: {
                    url: connectionPoolUrl,
                },
            },
            log: process.env.NODE_ENV === 'development'
                ? ['warn', 'error']
                : ['error'],
        });

        // Middleware para manejar reconexión automática
        this.$use(async (params, next) => {
            const maxQueryRetries = 3;
            let retries = 0;

            while (retries < maxQueryRetries) {
                try {
                    return await next(params);
                } catch (error) {
                    const isConnectionError =
                        error.message?.includes('Server has closed the connection') ||
                        error.message?.includes('Connection pool timeout') ||
                        error.message?.includes('Can\'t reach database server') ||
                        error.code === 'P1001' || // Can't reach database server
                        error.code === 'P1002' || // Database server timeout
                        error.code === 'P1017';   // Server has closed the connection

                    if (isConnectionError && retries < maxQueryRetries - 1) {
                        retries++;
                        this.logger.warn(
                            `Database connection error, retry ${retries}/${maxQueryRetries - 1}: ${error.message}`
                        );

                        // Esperar antes de reintentar
                        await new Promise(resolve => setTimeout(resolve, 1000 * retries));

                        // Intentar reconectar
                        try {
                            await this.$disconnect();
                            await this.$connect();
                            this.logger.log('Reconnected to database successfully');
                        } catch (reconnectError) {
                            this.logger.error(`Reconnection failed: ${reconnectError.message}`);
                        }

                        continue;
                    }

                    throw error;
                }
            }
        });
    }

    async onModuleInit() {
        await this.connectWithRetry();
    }

    async onModuleDestroy() {
        this.isConnected = false;
        await this.$disconnect();
        this.logger.log('Database connection closed');
    }

    private async connectWithRetry(attempt = 1): Promise<void> {
        try {
            await this.$connect();
            this.isConnected = true;
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
        setClauses.push(`version = version + 1`, `updated_at = NOW()`);

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

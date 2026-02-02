import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

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
                ? ['query', 'warn', 'error']
                : ['error'],
        });

        // Middleware eliminado: Reemplazado por PrismaRetryInterceptor
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
        } catch (error: unknown) {
            this.logger.warn(
                `Database connection attempt ${attempt}/${this.maxRetries} failed: ${error instanceof Error ? error.message : String(error)}`
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

    // 🔒 SEC-003: Whitelist of allowed tables for raw SQL updates
    private readonly ALLOWED_TABLES = new Set([
        'unidades',
        'minutas_definitivas',
        'detalles_venta',
        'clientes',
        'proyectos',
    ]);

    // 🔒 SEC-003: Regex to validate column names (alphanumeric + underscore, must start with letter/underscore)
    private readonly VALID_COLUMN_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

    // 🔒 SEC-003: UUID v4 regex for id validation
    private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // ⚡ OPTIMIZATION: Método para ejecutar updates rápidos con raw SQL
    // 🔒 SEC-003: Hardened against SQL injection with input validation
    async executeRawUpdate(
        table: string,
        id: string,
        data: Record<string, any>,
        version: number
    ): Promise<number> {
        // 🔒 Validate table name against whitelist
        if (!this.ALLOWED_TABLES.has(table.toLowerCase())) {
            this.logger.error(`SQL Injection attempt blocked: invalid table "${table}"`);
            throw new Error(`Invalid table name: ${table}`);
        }

        // 🔒 Validate UUID format
        if (!this.UUID_REGEX.test(id)) {
            this.logger.error(`SQL Injection attempt blocked: invalid UUID "${id}"`);
            throw new Error('Invalid UUID format for id parameter');
        }

        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                // 🔒 Validate column names
                if (!this.VALID_COLUMN_REGEX.test(key)) {
                    this.logger.error(`SQL Injection attempt blocked: invalid column "${key}"`);
                    throw new Error(`Invalid column name: ${key}`);
                }
                setClauses.push(`"${key}" = $${paramIndex}`);
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
            UPDATE "${table}"
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}::uuid AND version = $${paramIndex + 1}
        `;

        values.push(id, version);

        const result = await this.$executeRawUnsafe(query, ...values);
        return result;
    }
}

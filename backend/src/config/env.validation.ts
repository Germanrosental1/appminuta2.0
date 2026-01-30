/**
 * 🔒 S-002: Environment Validation
 * Valida variables de entorno al inicio para fallar rápido si falta configuración.
 */
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, Matches, MinLength, validateSync } from 'class-validator';

enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

// Regex para PostgreSQL URLs que acepta caracteres URL-encoded en password
const POSTGRES_URL_REGEX = /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/\w+(\?.*)?$/;

class EnvironmentVariables {
    // Core
    @IsEnum(Environment)
    @IsOptional()
    NODE_ENV: Environment = Environment.Development;

    @IsNumber()
    @IsOptional()
    PORT: number = 3000;

    // Database - usa Matches en lugar de IsUrl para soportar caracteres encoded
    @Matches(POSTGRES_URL_REGEX, { message: 'DATABASE_URL debe ser una URL válida de PostgreSQL (formato: postgresql://user:pass@host:port/db)' })
    DATABASE_URL: string;

    // Auth
    @IsString()
    @MinLength(16, { message: 'JWT_SECRET debe tener al menos 16 caracteres' })
    JWT_SECRET: string;

    @IsUrl({}, { message: 'SUPABASE_URL debe ser una URL válida' })
    SUPABASE_URL: string;

    @IsString()
    @MinLength(20, { message: 'SUPABASE_KEY es requerido' })
    SUPABASE_KEY: string;

    @IsString()
    @MinLength(16, { message: 'SUPABASE_JWT_SECRET es requerido' })
    SUPABASE_JWT_SECRET: string;

    // CORS
    @IsString()
    @IsOptional()
    ALLOWED_ORIGINS: string = 'http://localhost:3000';

    // Optional - usa Matches para soportar URLs con caracteres especiales
    @Matches(/^redis(s)?:\/\/.+/, { message: 'REDIS_URL debe ser una URL válida de Redis' })
    @IsOptional()
    REDIS_URL?: string;
}

export type EnvConfig = EnvironmentVariables;

let cachedEnv: EnvConfig | null = null;

/**
 * Valida y cachea las variables de entorno.
 * Falla rápido en producción si faltan variables críticas.
 */
export function validateEnv(): EnvConfig {
    if (cachedEnv) return cachedEnv;

    const config = plainToInstance(EnvironmentVariables, process.env, {
        enableImplicitConversion: true, // Para convertir strings a numbers automáticamente
    });

    const errors = validateSync(config, { skipMissingProperties: false });

    if (errors.length > 0) {
        console.error('Invalid environment configuration:');
        const formattedErrors = errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
            value: error.value,
        }));
        console.error(JSON.stringify(formattedErrors, null, 2));

        // En producción, fallar inmediatamente
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }

        // En desarrollo, mostrar warning pero continuar
        console.warn('⚠️ Continuing with partial config (development mode)');
        cachedEnv = config;
        return cachedEnv;
    }

    cachedEnv = config;
    console.log('Environment configuration validated');
    return cachedEnv;
}

/**
 * Obtiene una variable de entorno tipada.
 */
export function getEnv(): EnvConfig {
    if (!cachedEnv) {
        return validateEnv();
    }
    return cachedEnv;
}

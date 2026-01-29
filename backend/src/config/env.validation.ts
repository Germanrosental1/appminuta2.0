/**
 * 🔒 S-002: Environment Validation
 * Valida variables de entorno al inicio para fallar rápido si falta configuración.
 */
import { z } from 'zod';

const envSchema = z.object({
    // Core
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),

    // Database
    DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida'),

    // Auth
    JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
    SUPABASE_URL: z.string().url('SUPABASE_URL debe ser una URL válida'),
    SUPABASE_KEY: z.string().min(20, 'SUPABASE_KEY es requerido'),
    SUPABASE_JWT_SECRET: z.string().min(16, 'SUPABASE_JWT_SECRET es requerido'),

    // CORS
    ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

    // Optional
    REDIS_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

/**
 * Valida y cachea las variables de entorno.
 * Falla rápido en producción si faltan variables críticas.
 */
export function validateEnv(): EnvConfig {
    if (cachedEnv) return cachedEnv;

    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const errors = result.error.format();
        console.error('❌ Invalid environment configuration:');
        console.error(JSON.stringify(errors, null, 2));

        // En producción, fallar inmediatamente
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }

        // En desarrollo, mostrar warning pero continuar
        console.warn('⚠️ Continuing with partial config (development mode)');
        // Usar valores parciales
        cachedEnv = result.data;
        return cachedEnv;
    }

    cachedEnv = result.data;
    console.log('✅ Environment configuration validated');
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

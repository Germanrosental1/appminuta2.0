import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy) {
    constructor() {
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;

        if (!jwtSecret) {
            throw new Error('SUPABASE_JWT_SECRET must be defined in environment variables');
        }

        // 🔒 SEGURIDAD: Validación mejorada del JWT secret
        if (jwtSecret.length < 64) {
            throw new Error(
                'JWT secret must be at least 64 characters for security. ' +
                'Generate a strong secret with: openssl rand -base64 64'
            );
        }

        // Validar que sea base64 válido (formato recomendado)
        const base64Regex = /^[A-Za-z0-9+/=]+$/;
        // 🔒 SEGURIDAD: Solo advertir en desarrollo, no en producción
        if (process.env.NODE_ENV !== 'production' && !base64Regex.test(jwtSecret)) {
            console.warn(
                '⚠️  WARNING: JWT secret is not base64 encoded. ' +
                'For maximum security, use: openssl rand -base64 64'
            );
        }

        // Validar complejidad mínima (debe tener variedad de caracteres)
        const hasUpperCase = /[A-Z]/.test(jwtSecret);
        const hasLowerCase = /[a-z]/.test(jwtSecret);
        const hasNumbers = /[0-9]/.test(jwtSecret);
        const hasSpecialChars = /[+/=]/.test(jwtSecret);

        const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars]
            .filter(Boolean).length;

        if (complexityScore < 3) {
            throw new Error(
                'JWT secret lacks complexity. It must contain at least 3 of: ' +
                'uppercase letters, lowercase letters, numbers, special characters'
            );
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: any) {
        // Supabase JWT payload structure:
        // - sub: user ID
        // - email: user email
        // - role: authenticated/anon

        return {
            id: payload.sub, // Mapear 'sub' a 'id' para los guards
            email: payload.email,
            role: payload.role,
            ...payload, // Mantener el resto del payload
        };
    }
}

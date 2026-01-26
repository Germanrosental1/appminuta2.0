
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class UifSupabaseStrategy extends PassportStrategy(Strategy, 'uif-jwt') {
    constructor() {
        const supabaseProjectId = 'jgtetutmrjkxfjxnlcki'; // ID del proyecto UIF

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `https://${supabaseProjectId}.supabase.co/auth/v1/.well-known/jwks.json`,
            }),
            algorithms: ['RS256', 'ES256'], // Supabase usa ES256 por defecto
            issuer: `https://${supabaseProjectId}.supabase.co/auth/v1`,
        });
    }

    async validate(payload: any) {
        // Retornamos el payload tal cual, mapeando propiedades clave si es necesario
        // Supabase standard format: { sub: uuid, email: string, role: string, ... }
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            ...payload,
        };
    }
}

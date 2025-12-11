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

        if (jwtSecret.length < 32) {
            throw new Error('JWT secret must be at least 32 characters for security');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: any) {
        // Return the payload to request.user
        return payload;
    }
}

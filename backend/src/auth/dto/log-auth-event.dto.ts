import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum AuthEventType {
    LOGIN_SUCCESS = 'login_success',
    LOGIN_FAILED = 'login_failed',
    LOGOUT = 'logout',
    TOKEN_REFRESHED = 'token_refreshed',
    SESSION_EXPIRED = 'session_expired',
    AUTH_ERROR = 'auth_error',
    PASSWORD_CHANGED = 'password_changed',
    // MFA Events
    MFA_ENROLLED = 'mfa_enrolled',
    MFA_VERIFIED = 'mfa_verified',
    MFA_UNENROLLED = 'mfa_unenrolled',
    MFA_FAILED = 'mfa_failed',
}

export class LogAuthEventDto {
    @ApiProperty({
        description: 'Tipo de evento de autenticación',
        enum: AuthEventType,
        example: AuthEventType.LOGIN_SUCCESS,
    })
    @IsEnum(AuthEventType)
    eventType: AuthEventType;

    @ApiPropertyOptional({
        description: 'Email del usuario asociado al evento',
        example: 'usuario@rosental.com',
    })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({
        description: 'Metadatos adicionales del evento (flexible)',
        example: { ip: '192.168.1.1', provider: 'google' },
    })
    @IsOptional()
    @IsObject()
    details?: Record<string, any>;

    @ApiPropertyOptional({
        description: 'User-agent del navegador/dispositivo',
        example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
    })
    @IsOptional()
    @IsString()
    userAgent?: string;
}

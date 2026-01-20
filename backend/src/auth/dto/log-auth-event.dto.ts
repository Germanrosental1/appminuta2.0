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
    @IsEnum(AuthEventType)
    eventType: AuthEventType;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsObject()
    details?: Record<string, any>;

    @IsOptional()
    @IsString()
    userAgent?: string;
}

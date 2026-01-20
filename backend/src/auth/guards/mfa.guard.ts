import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * MFAGuard - Valida que el usuario haya completado MFA (AAL2)
 * 
 * Uso: @UseGuards(SupabaseAuthGuard, MFAGuard)
 * 
 * El JWT de Supabase incluye el claim `aal` (Authenticator Assurance Level):
 * - aal1: Autenticación básica (email/password)
 * - aal2: Autenticación con segundo factor (TOTP verificado)
 */
@Injectable()
export class MFAGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Usuario no autenticado');
        }

        // Verificar AAL level
        const aal = user.aal || 'aal1';

        if (aal !== 'aal2') {
            throw new ForbiddenException(
                'Se requiere autenticación de doble factor (MFA) para acceder a este recurso'
            );
        }

        return true;
    }
}

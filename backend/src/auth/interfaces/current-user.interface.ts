/**
 * Interface tipada para el payload del usuario autenticado
 * Reemplaza `@CurrentUser() user: any` en los controllers
 */
export interface CurrentUserPayload {
    /** UUID del usuario en auth.users */
    id: string;

    /** Email del usuario */
    email: string;

    /** Audience del token JWT */
    aud?: string;

    /** Rol del token (supabase internal) */
    role?: string;

    /** Timestamp de expiración */
    exp?: number;

    /** Timestamp de emisión */
    iat?: number;
}

/**
 * 🔒 SEGURIDAD: Helpers de privacidad para enmascarar datos sensibles
 * Parte de las mejoras de seguridad para alcanzar 10/10
 */

/**
 * Enmascara un email mostrando solo el primer y último carácter del local
 * Ejemplo: "usuario@ejemplo.com" → "u****o@ejemplo.com"
 */
export function maskEmail(email: string | null | undefined): string {
    if (!email || typeof email !== 'string') return '***@***';

    const atIndex = email.indexOf('@');
    if (atIndex === -1) return '***@***';

    const local = email.substring(0, atIndex);
    const domain = email.substring(atIndex);

    if (local.length <= 2) {
        return `${local[0]}***${domain}`;
    }

    return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}${domain}`;
}

/**
 * Enmascara un DNI mostrando solo los últimos 3 dígitos
 * Ejemplo: "12345678" → "*****678"
 */
export function maskDni(dni: string | null | undefined): string {
    if (!dni || typeof dni !== 'string') return '********';

    if (dni.length <= 3) return dni;

    return '*'.repeat(dni.length - 3) + dni.slice(-3);
}

/**
 * Enmascara un teléfono mostrando solo los últimos 4 dígitos
 * Ejemplo: "+541112345678" → "********5678"
 */
export function maskPhone(phone: string | null | undefined): string {
    if (!phone || typeof phone !== 'string') return '********';

    // Remover caracteres no numéricos para contar
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return phone;

    return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

/**
 * Enmascara un nombre mostrando solo la inicial
 * Ejemplo: "Juan Pérez" → "J. P."
 */
export function maskName(name: string | null | undefined): string {
    if (!name || typeof name !== 'string') return '***';

    const parts = name.trim().split(/\s+/);
    return parts.map(part => part[0]?.toUpperCase() + '.').join(' ');
}

/**
 * Objeto con todos los helpers de privacidad
 */
export const PrivacyHelpers = {
    maskEmail,
    maskDni,
    maskPhone,
    maskName,
};

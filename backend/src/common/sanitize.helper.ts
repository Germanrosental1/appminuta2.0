import * as sanitizeHtml from 'sanitize-html';

/**
 * Sanitiza un string removiendo tags HTML peligrosos y scripts
 * 🔒 SEGURIDAD: Múltiples capas de protección contra XSS
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    if (!input || input.trim() === '') return '';

    // Primera capa: sanitize-html
    let sanitized = sanitizeHtml(input, {
        allowedTags: [], // No permitir ningún tag HTML
        allowedAttributes: {},
        disallowedTagsMode: 'escape', // Escapar en lugar de eliminar
    });

    // Segunda capa: Remover protocolos peligrosos (usando replace con /g)
    sanitized = sanitized
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/file:/gi, '');

    // Tercera capa: Remover event handlers
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Cuarta capa: Remover caracteres de control
    const controlCharsRegex = /[\u0000-\u001F\u007F]/g;
    sanitized = sanitized.replace(controlCharsRegex, '');

    return sanitized.trim();
}

/**
 * Sanitiza un objeto recursivamente, limpiando todos los strings
 * SEGURIDAD: Previene prototype pollution y XSS en objetos JSONB
 */
export function sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized: any = {};

        for (const [key, value] of Object.entries(obj)) {
            // Prevenir prototype pollution
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue; // Skip dangerous keys
            }

            // Sanitizar la key también
            const sanitizedKey = key.replace(/[^\w\s-]/g, '');

            // Validar que la key no esté vacía después de sanitizar
            if (!sanitizedKey || sanitizedKey.trim() === '') {
                continue;
            }

            sanitized[sanitizedKey] = sanitizeObject(value);
        }
        return sanitized;
    }

    return obj;
}

/**
 * Sanitiza HTML permitiendo solo tags seguros
 * Para casos donde se necesita HTML básico
 */
export function sanitizeHTML(html: string): string {
    if (typeof html !== 'string') return '';
    if (!html || html.trim() === '') return '';

    return sanitizeHtml(html, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        allowedAttributes: {}, // No permitir atributos
        disallowedTagsMode: 'escape',
        // Configuración adicional de seguridad
        allowedSchemes: [], // No permitir ningún esquema de URL
        allowedSchemesByTag: {},
        allowProtocolRelative: false,
    });
}

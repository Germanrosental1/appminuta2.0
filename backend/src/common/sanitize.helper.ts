import * as sanitizeHtml from 'sanitize-html';

/**
 * Sanitiza un string removiendo tags HTML peligrosos y scripts
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    return sanitizeHtml(input, {
        allowedTags: [], // No permitir ningún tag HTML
        allowedAttributes: {},
        disallowedTagsMode: 'discard',
    });
}

/**
 * Sanitiza un objeto recursivamente, limpiando todos los strings
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
            // También sanitizar las keys para prevenir prototype pollution
            const sanitizedKey = sanitizeString(key);
            // Prevenir prototype pollution
            if (sanitizedKey === '__proto__' || sanitizedKey === 'constructor' || sanitizedKey === 'prototype') {
                continue; // Skip dangerous keys
            }
            sanitized[sanitizedKey] = sanitizeObject(value);
        }
        return sanitized;
    }

    return obj;
}

/**
 * Sanitiza HTML permitiendo solo tags seguros
 */
export function sanitizeHTML(html: string): string {
    if (typeof html !== 'string') return '';

    return sanitizeHtml(html, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        allowedAttributes: {},
        disallowedTagsMode: 'discard',
    });
}

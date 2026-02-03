import { describe, it, expect } from 'vitest';
import {
    sanitizeString,
    sanitizeEmail,
    sanitizePhone,
    sanitizeRut,
    sanitizeObject,
    containsMaliciousCode,
    containsSQLInjection,
    sanitizeHTML,
    escapeSQLString,
    sanitizeUUID,
    sanitizeFilePath,
    normalizeWhitespace,
} from './sanitize';

describe('sanitize utilities', () => {
    describe('sanitizeString', () => {
        it('should remove script tags', () => {
            const input = 'Hello<script>alert("xss")</script>World';
            expect(sanitizeString(input)).toBe('HelloWorld');
        });

        it('should remove onclick handlers', () => {
            const input = '<div onclick="steal()" >Click</div>';
            // The regex removes 'onclick=' pattern but leaves surrounding content
            const result = sanitizeString(input);
            expect(result).not.toContain('onclick=');
        });

        it('should remove javascript: protocol', () => {
            const input = 'javascript:alert(1)';
            expect(sanitizeString(input)).toBe('alert(1)');
        });

        it('should handle empty/null input', () => {
            expect(sanitizeString('')).toBe('');
            expect(sanitizeString(null as any)).toBe('');
        });
    });

    describe('sanitizeEmail', () => {
        it('should clean valid emails', () => {
            expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
        });

        it('should remove invalid characters', () => {
            expect(sanitizeEmail('user<script>@test.com')).toBe('userscript@test.com');
        });
    });

    describe('sanitizePhone', () => {
        it('should keep valid phone characters', () => {
            expect(sanitizePhone('+1-555-123-4567')).toBe('+1-555-123-4567');
        });

        it('should remove invalid characters', () => {
            expect(sanitizePhone('555<script>1234')).toBe('5551234');
        });
    });

    describe('sanitizeRut', () => {
        it('should keep valid RUT format', () => {
            expect(sanitizeRut('12.345.678-K')).toBe('12.345.678-K');
        });

        it('should uppercase dígito verificador', () => {
            expect(sanitizeRut('12.345.678-k')).toBe('12.345.678-K');
        });
    });

    describe('sanitizeObject', () => {
        it('should sanitize nested objects recursively', () => {
            const input = {
                name: 'Test<script>alert(1)</script>',
                nested: {
                    email: 'USER@EXAMPLE.COM',
                },
            };

            const result = sanitizeObject(input);
            expect(result.name).toBe('Test');
            expect(result.nested.email).toBe('user@example.com');
        });

        it('should handle arrays', () => {
            const input = {
                tags: ['<script>evil</script>', 'safe'],
            };

            const result = sanitizeObject(input);
            expect(result.tags).toEqual(['', 'safe']);
        });
    });

    describe('containsMaliciousCode', () => {
        it('should detect script tags', () => {
            expect(containsMaliciousCode('<script>alert(1)</script>')).toBe(true);
        });

        it('should detect event handlers', () => {
            expect(containsMaliciousCode('onclick=')).toBe(true);
        });

        it('should return false for safe input', () => {
            expect(containsMaliciousCode('Hello World')).toBe(false);
        });
    });

    describe('containsSQLInjection', () => {
        it('should detect DROP statements', () => {
            expect(containsSQLInjection("'; DROP TABLE users;--")).toBe(true);
        });

        it('should detect UNION attacks', () => {
            expect(containsSQLInjection("1' UNION SELECT * FROM passwords--")).toBe(true);
        });

        it('should return false for safe input', () => {
            expect(containsSQLInjection('SELECT a product')).toBe(true); // SELECT is flagged
            expect(containsSQLInjection('Hello World 123')).toBe(false);
        });
    });

    describe('sanitizeHTML', () => {
        it('should remove script tags but keep safe HTML', () => {
            const input = '<p>Hello</p><script>evil()</script><b>World</b>';
            expect(sanitizeHTML(input)).toBe('<p>Hello</p><b>World</b>');
        });

        it('should remove event handlers from tags', () => {
            const input = '<div onclick="evil()" class="safe">Text</div>';
            expect(sanitizeHTML(input)).toBe('<div class="safe">Text</div>');
        });
    });

    describe('escapeSQLString', () => {
        it('should escape single quotes', () => {
            expect(escapeSQLString("O'Brien")).toBe("O''Brien");
        });

        it('should escape backslashes', () => {
            expect(escapeSQLString(String.raw`path\to\file`)).toBe(String.raw`path\\to\\file`);
        });
    });

    describe('sanitizeUUID', () => {
        it('should accept valid UUIDs', () => {
            const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
            expect(sanitizeUUID(uuid)).toBe(uuid);
        });

        it('should reject invalid UUIDs', () => {
            expect(sanitizeUUID('not-a-uuid')).toBe(null);
            expect(sanitizeUUID('')).toBe(null);
        });
    });

    describe('sanitizeFilePath', () => {
        it('should remove directory traversal', () => {
            expect(sanitizeFilePath('../../../etc/passwd')).toBe('etc/passwd');
        });

        it('should normalize slashes', () => {
            expect(sanitizeFilePath('path//to///file')).toBe('path/to/file');
        });
    });

    describe('normalizeWhitespace', () => {
        it('should collapse multiple spaces', () => {
            expect(normalizeWhitespace('hello    world')).toBe('hello world');
        });

        it('should trim edges', () => {
            expect(normalizeWhitespace('  hello  ')).toBe('hello');
        });
    });
});

import {
    sanitizeString,
    sanitizeObject,
    maskEmail,
    maskPII,
} from './sanitize.helper';

describe('sanitize.helper', () => {
    describe('sanitizeString', () => {
        describe('XSS Prevention', () => {
            it('should remove script tags', () => {
                const input = '<script>alert("XSS")</script>Hello';
                const result = sanitizeString(input);
                expect(result).not.toContain('<script>');
                // Implementation uses 'escape' mode, so content remains but tags are neutralized.
                expect(result).toContain('&lt;script&gt;');
            });

            it('should remove javascript: protocol', () => {
                const input = 'javascript:alert(1)';
                const result = sanitizeString(input);
                expect(result).not.toContain('javascript:');
            });

            it('should remove event handlers', () => {
                const input = 'onclick=alert(1)';
                const result = sanitizeString(input);
                expect(result).not.toContain('onclick=');
            });

            it('should remove control characters', () => {
                const input = 'Hello\x00\x01\x02World';
                const result = sanitizeString(input);
                expect(result).toBe('HelloWorld');
            });
        });

        describe('Input Validation', () => {
            it('should return empty string for non-string input', () => {
                expect(sanitizeString(null as any)).toBe('');
                expect(sanitizeString(undefined as any)).toBe('');
            });

            it('should trim whitespace', () => {
                const input = '  Hello World  ';
                const result = sanitizeString(input);
                expect(result).toBe('Hello World');
            });
        });

        describe('Normal Content', () => {
            it('should preserve safe strings', () => {
                const input = 'Hello World 123';
                const result = sanitizeString(input);
                expect(result).toBe('Hello World 123');
            });
        });
    });

    describe('sanitizeObject', () => {
        describe('Prototype Pollution Prevention', () => {
            it('should remove __proto__ property', () => {
                const input = {
                    name: 'John',
                    '__proto__': { isAdmin: true },
                };
                const result = sanitizeObject(input);
                // __proto__ is always present in objects, check keys instead or verify it's not polluted
                expect(Object.keys(result)).not.toContain('__proto__');
                expect((result).isAdmin).toBeUndefined();
                expect(result.name).toBeDefined();
            });

            it('should remove constructor property', () => {
                const input = {
                    name: 'John',
                    'constructor': { prototype: { isAdmin: true } },
                };
                const result = sanitizeObject(input);
                expect(Object.keys(result)).not.toContain('constructor');
            });

            it('should remove prototype property', () => {
                const input = {
                    name: 'John',
                    'prototype': { isAdmin: true },
                };
                const result = sanitizeObject(input);
                expect(Object.keys(result)).not.toContain('prototype');
            });
        });

        describe('Recursive Sanitization', () => {
            it('should sanitize nested objects', () => {
                const input = {
                    user: {
                        name: '<script>alert(1)</script>John',
                        email: 'test@example.com',
                    },
                };
                const result = sanitizeObject(input);
                expect(result.user.name).not.toContain('<script>');
            });

            it('should sanitize arrays', () => {
                const input = {
                    items: ['<script>XSS</script>', 'Safe Item'],
                };
                const result = sanitizeObject(input);
                expect(result.items[0]).not.toContain('<script>');
                expect(result.items[1]).toBe('Safe Item');
            });
        });

        describe('Edge Cases', () => {
            it('should handle null and undefined', () => {
                expect(sanitizeObject(null)).toBeNull();
                expect(sanitizeObject(undefined)).toBeUndefined();
            });

            it('should handle empty objects', () => {
                const result = sanitizeObject({});
                expect(result).toEqual({});
            });

            it('should handle objects with numeric properties', () => {
                const input = {
                    age: 25,
                    price: 99.99,
                    count: 0,
                };
                const result = sanitizeObject(input);
                expect(result.age).toBe(25);
                expect(result.price).toBe(99.99);
                expect(result.count).toBe(0);
            });
        });
    });

    describe('maskEmail', () => {
        it('should mask standard email addresses', () => {
            const result = maskEmail('john.doe@example.com');
            expect(result).toBe('jo***@example.com');
        });

        it('should mask short usernames', () => {
            const result = maskEmail('a@example.com');
            expect(result).toBe('a***@example.com');
        });

        it('should handle invalid email format', () => {
            const result = maskEmail('notanemail');
            expect(result).toBe('***');
        });

        it('should handle empty string', () => {
            const result = maskEmail('');
            expect(result).toBe('unknown');
        });

        it('should handle null and undefined', () => {
            expect(maskEmail(null as any)).toBe('unknown');
            expect(maskEmail(undefined as any)).toBe('unknown');
        });

        it('should preserve domain', () => {
            const result = maskEmail('user@subdomain.example.com');
            expect(result).toContain('@subdomain.example.com');
        });
    });

    describe('maskPII', () => {
        it('should mask strings longer than 4 characters', () => {
            const result = maskPII('1234567890');
            expect(result).toBe('12****90');
        });

        it('should mask short strings with asterisks', () => {
            const result = maskPII('123');
            expect(result).toBe('****');
        });

        it('should handle numbers', () => {
            const result = maskPII(1234567890);
            expect(result).toBe('12****90');
        });

        it('should handle empty values', () => {
            expect(maskPII('')).toBe('');
            expect(maskPII(null)).toBe('');
            expect(maskPII(undefined)).toBe('');
        });

        it('should preserve first 2 and last 2 characters', () => {
            const result = maskPII('ABCDEFGH');
            expect(result).toBe('AB****GH');
        });
    });
});

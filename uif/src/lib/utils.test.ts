import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
    it('should merge class names', () => {
        const result = cn('foo', 'bar');
        expect(result).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        const includeClass = true;
        const excludeClass = false;
        const result = cn('base', includeClass && 'included', excludeClass && 'excluded');
        expect(result).toBe('base included');
    });

    it('should merge tailwind classes correctly', () => {
        // twMerge should dedupe conflicting tailwind classes
        const result = cn('px-2', 'px-4');
        expect(result).toBe('px-4');
    });

    it('should handle empty inputs', () => {
        const result = cn();
        expect(result).toBe('');
    });

    it('should handle arrays of classes', () => {
        const result = cn(['foo', 'bar'], 'baz');
        expect(result).toBe('foo bar baz');
    });

    it('should handle objects with boolean values', () => {
        const result = cn({ 'class-a': true, 'class-b': false });
        expect(result).toBe('class-a');
    });
});

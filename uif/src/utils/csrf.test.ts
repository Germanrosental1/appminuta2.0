import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateCSRFToken, setCSRFToken, getCSRFToken } from './csrf';

// Mock crypto.getRandomValues
const mockGetRandomValues = vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
    }
    return array;
});

vi.stubGlobal('crypto', {
    getRandomValues: mockGetRandomValues,
});

describe('CSRF Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        document.cookie = '';
    });

    describe('generateCSRFToken', () => {
        it('should generate a 64-character hex string', () => {
            const token = generateCSRFToken();
            expect(token).toHaveLength(64);
            expect(/^[0-9a-f]+$/.test(token)).toBe(true);
        });

        it('should call crypto.getRandomValues', () => {
            generateCSRFToken();
            expect(mockGetRandomValues).toHaveBeenCalled();
        });

        it('should generate consistent output with mocked random', () => {
            const token = generateCSRFToken();
            // With our mock, the first bytes are 00, 01, 02, ...
            expect(token.startsWith('000102')).toBe(true);
        });
    });

    describe('setCSRFToken', () => {
        it('should generate and return a token', () => {
            const token = setCSRFToken();
            expect(token).toHaveLength(64);
        });

        it('should store token in sessionStorage', () => {
            const token = setCSRFToken();
            expect(sessionStorage.getItem('xsrf_token')).toBe(token);
        });

        it('should set cookie', () => {
            setCSRFToken();
            expect(document.cookie).toContain('XSRF-TOKEN=');
        });
    });

    describe('getCSRFToken', () => {
        it('should return token from sessionStorage if exists', () => {
            const existingToken = 'existing-token-12345';
            sessionStorage.setItem('xsrf_token', existingToken);

            const token = getCSRFToken();
            expect(token).toBe(existingToken);
        });

        it('should generate new token if none exists', () => {
            const token = getCSRFToken();
            expect(token).not.toBeNull();
            expect(token).toHaveLength(64);
        });

        it('should store generated token in sessionStorage', () => {
            getCSRFToken();
            expect(sessionStorage.getItem('xsrf_token')).not.toBeNull();
        });
    });
});

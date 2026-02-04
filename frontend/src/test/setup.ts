import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import './mocks/server';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock window.location
delete (globalThis as any).location;
globalThis.location = {
    href: '',
    pathname: '/',
    search: '',
    hash: '',
} as any;

// Mock globalThis.location for api-client
Object.defineProperty(globalThis, 'location', {
    value: {
        href: '',
        pathname: '/',
    },
    writable: true,
});

// Mock IntersectionObserver
 
globalThis.IntersectionObserver = class IntersectionObserver {
    disconnect() { return; }
    observe() { return; }
    takeRecords() {
        return [];
    }
    unobserve() { return; }
} as any;

// Mock ResizeObserver
 
globalThis.ResizeObserver = class ResizeObserver {
    disconnect() { return; }
    observe() { return; }
    unobserve() { return; }
} as any;

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

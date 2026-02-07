import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup();
});

// Mock ResizeObserver for react-virtual
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock scrollTo (not implemented in JSDOM)
Element.prototype.scrollTo = vi.fn();

// Mock offsetHeight/offsetWidth for virtualization measurements
Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: {
        get() {
            return Number.parseFloat(this.style.height) || 100;
        },
    },
    offsetWidth: {
        get() {
            return Number.parseFloat(this.style.width) || 100;
        },
    },
});

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import './mocks/server';

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
// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords() {
    return [];
  }
  unobserve = vi.fn();
} as any;

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
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

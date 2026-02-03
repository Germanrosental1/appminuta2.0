import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
    it('should run a basic test', () => {
        expect(true).toBe(true);
    });

    it('should have jest-dom matchers available', () => {
        const element = document.createElement('div');
        element.textContent = 'Hello World';
        document.body.appendChild(element);
        expect(element).toBeInTheDocument();
        element.remove(); // Cleanup
    });

    it('should have access to window object', () => {
        expect(globalThis).toBeDefined();
        expect(globalThis.matchMedia).toBeDefined();
    });
});

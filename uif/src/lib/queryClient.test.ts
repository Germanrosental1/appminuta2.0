import { describe, it, expect } from 'vitest';
import { queryClient } from './queryClient';

describe('queryClient', () => {
    it('should be a valid QueryClient instance', () => {
        expect(queryClient).toBeDefined();
        expect(queryClient.getDefaultOptions).toBeDefined();
    });

    it('should have correct staleTime default', () => {
        const options = queryClient.getDefaultOptions();
        expect(options.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should have correct gcTime default', () => {
        const options = queryClient.getDefaultOptions();
        expect(options.queries?.gcTime).toBe(10 * 60 * 1000); // 10 minutes
    });

    it('should have retry set to 1 for queries', () => {
        const options = queryClient.getDefaultOptions();
        expect(options.queries?.retry).toBe(1);
    });

    it('should have refetchOnWindowFocus disabled', () => {
        const options = queryClient.getDefaultOptions();
        expect(options.queries?.refetchOnWindowFocus).toBe(false);
    });

    it('should have refetchOnReconnect enabled', () => {
        const options = queryClient.getDefaultOptions();
        expect(options.queries?.refetchOnReconnect).toBe(true);
    });

    it('should have retry set to 1 for mutations', () => {
        const options = queryClient.getDefaultOptions();
        expect(options.mutations?.retry).toBe(1);
    });
});

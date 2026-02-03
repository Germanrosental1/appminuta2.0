import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/context/AuthContext';
import { ReactNode } from 'react';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } },
            })),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
        },
    },
}));

// Mock API clients
vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock('@/services/rbac', () => ({
    rbacApi: {
        getRoles: vi.fn().mockResolvedValue([]),
        getPermissions: vi.fn().mockResolvedValue([]),
    },
}));

describe('useAuth', () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Hook Usage', () => {
        it('should throw error when used outside AuthProvider', () => {
            // Suppress console.error for this test
            const originalError = console.error;
            console.error = vi.fn();

            expect(() => {
                renderHook(() => useAuth());
            }).toThrow('useAuth debe ser usado dentro de un AuthProvider');

            console.error = originalError;
        });

        it('should return auth context when used inside AuthProvider', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toBeDefined();
            expect(result.current).toHaveProperty('user');
            expect(result.current).toHaveProperty('loading');
        });
    });

    describe('Auth Context Values', () => {
        it('should provide user property', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('user');
        });

        it('should provide loading state', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('loading');
            expect(typeof result.current.loading).toBe('boolean');
        });

        it('should provide signIn function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('signIn');
            expect(typeof result.current.signIn).toBe('function');
        });

        it('should provide signOut function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('signOut');
            expect(typeof result.current.signOut).toBe('function');
        });

        it('should provide permissions array', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('permissions');
            expect(Array.isArray(result.current.permissions)).toBe(true);
        });

        it('should provide roles array', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('roles');
            expect(Array.isArray(result.current.roles)).toBe(true);
        });
    });

    describe('Permission Checks', () => {
        it('should provide hasPermission function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('hasPermission');
            expect(typeof result.current.hasPermission).toBe('function');
        });

        it('should provide hasAnyPermission function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('hasAnyPermission');
            expect(typeof result.current.hasAnyPermission).toBe('function');
        });

        it('should provide hasAllPermissions function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('hasAllPermissions');
            expect(typeof result.current.hasAllPermissions).toBe('function');
        });

        it('should provide hasRole function', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(result.current).toHaveProperty('hasRole');
            expect(typeof result.current.hasRole).toBe('function');
        });
    });

    describe('Initial State', () => {
        it('should have defined loading state', () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            expect(typeof result.current.loading).toBe('boolean');
        });

        it('should have null user initially when not authenticated', async () => {
            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toBeNull();
        });
    });
});

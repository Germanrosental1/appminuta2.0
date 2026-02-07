import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { createWrapper } from '../utils';

// Mock Dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            })),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: null, error: null })
                }))
            }))
        }))
    },
}));

vi.mock('@/lib/api-wrapper-client', () => ({
    apiGet: vi.fn(),
}));

vi.mock('@/services/rbac', () => ({
    getPermissions: vi.fn().mockResolvedValue([]),
}));

const QueryWrapper = createWrapper();

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper>
        <AuthProvider>{children}</AuthProvider>
    </QueryWrapper>
);

describe('AuthContext', () => {

    it('should initialize with loading state and then settle', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Initially loading might be true or false depending on how fast useEffect runs
        // But initially user is null
        expect(result.current.user).toBeNull();

        // AuthContext usually starts loading=true
        // Let's wait for it to settle (loading=false)
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.user).toBeNull();
    });
});

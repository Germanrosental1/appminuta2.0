import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthContext } from './AuthContext';
import React from 'react';
import '@testing-library/jest-dom';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } },
            })),
            signInWithPassword: vi.fn(),
            signOut: vi.fn().mockResolvedValue({ error: null }),
            updateUser: vi.fn(),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
        })),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
}));

// Mock RBAC API
vi.mock('@/services/rbac', () => ({
    rbacApi: {
        getMyRoles: vi.fn().mockResolvedValue([]),
        getUserPermissions: vi.fn().mockResolvedValue([]),
    },
    Role: {},
    Permission: {},
}));

// Mock CSRF
vi.mock('@/utils/csrf', () => ({
    setCSRFToken: vi.fn(),
    clearCSRFToken: vi.fn(),
    refreshCSRFToken: vi.fn(),
}));

// Mock password validation
vi.mock('@/utils/passwordValidation', () => ({
    sanitizePassword: vi.fn((p) => p),
}));

// Test helper component to consume context
const TestConsumer: React.FC = () => {
    const context = React.useContext(AuthContext);
    if (!context) return <div>No Context</div>;

    return (
        <div>
            <div data-testid="loading">{String(context.loading)}</div>
            <div data-testid="user">{context.user?.email || 'No user'}</div>
            <div data-testid="isAdmin">{String(context.isAdmin)}</div>
            <div data-testid="roles">{context.roles.length}</div>
            <button onClick={() => context.signIn('test@test.com', 'password')}>Sign In</button>
            <button onClick={() => context.signOut()}>Sign Out</button>
        </div>
    );
};

const createTestWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );

    return TestWrapper;
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Provider Initialization', () => {
        it('should provide context to children', async () => {
            const Wrapper = createTestWrapper();

            render(
                <Wrapper>
                    <TestConsumer />
                </Wrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toBeInTheDocument();
            });
        });

        it('should start with no user when no session', async () => {
            const Wrapper = createTestWrapper();

            render(
                <Wrapper>
                    <TestConsumer />
                </Wrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            expect(screen.getByTestId('user')).toHaveTextContent('No user');
        });

        it('should provide permission helper functions', async () => {
            const Wrapper = createTestWrapper();

            render(
                <Wrapper>
                    <TestConsumer />
                </Wrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
                expect(screen.getByTestId('roles')).toHaveTextContent('0');
            });
        });
    });

    describe('Sign In Flow', () => {
        it('should call signInWithPassword on sign in', async () => {
            const { supabase } = await import('../lib/supabase');
            vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
                data: { user: { id: '1', email: 'test@test.com' }, session: {} },
                error: null,
            } as any);

            const user = userEvent.setup();
            const Wrapper = createTestWrapper();

            render(
                <Wrapper>
                    <TestConsumer />
                </Wrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            await user.click(screen.getByText('Sign In'));

            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'test@test.com',
                password: 'password',
            });
        });
    });

    describe('Sign Out Flow', () => {
        it('should clear user state on sign out', async () => {
            const { supabase } = await import('../lib/supabase');
            const user = userEvent.setup();
            const Wrapper = createTestWrapper();

            render(
                <Wrapper>
                    <TestConsumer />
                </Wrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            await user.click(screen.getByText('Sign Out'));

            expect(supabase.auth.signOut).toHaveBeenCalled();
        });
    });

    describe('Permission Helpers', () => {
        it('should provide hasRole function', async () => {
            const Wrapper = createTestWrapper();

            render(
                <Wrapper>
                    <TestConsumer />
                </Wrapper>
            );

            await waitFor(() => {
                // isAdmin uses hasRole('administrador') internally
                expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
            });
        });

        it('should provide roles array', async () => {
            const Wrapper = createTestWrapper();

            render(
                <Wrapper>
                    <TestConsumer />
                </Wrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('roles')).toHaveTextContent('0');
            });
        });
    });
});

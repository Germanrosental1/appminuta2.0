import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Create a test QueryClient with disabled retries and cache
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllTheProvidersProps {
  children: React.ReactNode;
}

export function AllTheProviders({ children }: AllTheProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom render function that includes all providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    }),
    refreshSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'refreshed-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({
      error: null,
    }),
    onAuthStateChange: vi.fn((callback) => {
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    }),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

// Mock CSRF token
export function mockCSRFToken(token: string = 'test-csrf-token') {
  vi.mock('@/utils/csrf', () => ({
    getCSRFToken: vi.fn(() => token),
  }));
}

// Wait for async operations
export const waitFor = (callback: () => void, options?: { timeout?: number }) => {
  return new Promise<void>((resolve) => {
    const timeout = options?.timeout || 100;
    setTimeout(() => {
      callback();
      resolve();
    }, timeout);
  });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };

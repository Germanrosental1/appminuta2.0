import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, AuthContext } from './AuthContext';
import { supabase } from '../lib/supabase';
import { useContext } from 'react';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01',
};

const mockProfile = {
  Nombre: 'John',
  Apellido: 'Doe',
};

const mockRoles = [
  { Id: 'role-1', Nombre: 'superadminmv', CreatedAt: '2024-01-01' },
];

const mockUserRoles = [
  { IdUsuario: 'user-123', IdRol: 'role-1' },
];

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  const TestComponent = () => {
    const auth = useContext(AuthContext);
    if (!auth) return <div>No Auth Context</div>;

    return (
      <div>
        <div data-testid="user">{auth.user ? auth.user.email : 'No user'}</div>
        <div data-testid="loading">{auth.loading ? 'Loading' : 'Not loading'}</div>
        <div data-testid="roles">{auth.roles.length}</div>
        <div data-testid="permissions">{auth.permissions.length}</div>
        <div data-testid="is-superadmin">{auth.isSuperAdminMV ? 'Yes' : 'No'}</div>
        <div data-testid="is-admin">{auth.isAdminMV ? 'Yes' : 'No'}</div>
      </div>
    );
  };

  const renderWithAuthProvider = () => {
    return render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
  };

  it('should initialize with no user', async () => {
    renderWithAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });
  });

  it('should load user from session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        } as any,
      },
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'Profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockProfile, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'UsuariosRoles') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockUserRoles, error: null }),
          }),
        } as any;
      }
      if (table === 'Roles') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockRoles, error: null }),
          }),
        } as any;
      }
      return {} as any;
    });

    renderWithAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });
  });

  it('should load roles and set helper flags', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        } as any,
      },
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'Profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockProfile, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'UsuariosRoles') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockUserRoles, error: null }),
          }),
        } as any;
      }
      if (table === 'Roles') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockRoles, error: null }),
          }),
        } as any;
      }
      return {} as any;
    });

    renderWithAuthProvider();

    await waitFor(() => {
      expect(screen.getByTestId('roles')).toHaveTextContent('1');
      expect(screen.getByTestId('is-superadmin')).toHaveTextContent('Yes');
    });
  });

  it('should handle sign in', async () => {
    const TestSignIn = () => {
      const auth = useContext(AuthContext);
      const handleSignIn = async () => {
        await auth?.signIn('test@example.com', 'password');
      };

      return (
        <div>
          <button onClick={handleSignIn}>Sign In</button>
        </div>
      );
    };

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: null } as any,
      error: null,
    });

    render(
      <AuthProvider>
        <TestSignIn />
      </AuthProvider>
    );

    const button = screen.getByText('Sign In');
    button.click();

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });
  });

  it('should handle sign out', async () => {
    const TestSignOut = () => {
      const auth = useContext(AuthContext);
      const handleSignOut = async () => {
        await auth?.signOut();
      };

      return (
        <div>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      );
    };

    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestSignOut />
      </AuthProvider>
    );

    const button = screen.getByText('Sign Out');
    button.click();

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  it('should handle auth state changes', async () => {
    let authCallback: any;

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      } as any;
    });

    renderWithAuthProvider();

    // Simulate SIGNED_IN event
    await waitFor(() => {
      if (authCallback) {
        authCallback('SIGNED_IN', {
          user: mockUser,
          access_token: 'token',
        });
      }
    });

    expect(authCallback).toBeDefined();
  });

  it('should handle role checks', async () => {
    const TestRoleCheck = () => {
      const auth = useContext(AuthContext);
      return (
        <div>
          <div data-testid="has-superadmin">
            {auth?.hasRole('superadminmv') ? 'Yes' : 'No'}
          </div>
          <div data-testid="has-viewer">
            {auth?.hasRole('viewermv') ? 'Yes' : 'No'}
          </div>
        </div>
      );
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
        } as any,
      },
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'UsuariosRoles') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockUserRoles, error: null }),
          }),
        } as any;
      }
      if (table === 'Roles') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockRoles, error: null }),
          }),
        } as any;
      }
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      } as any;
    });

    render(
      <AuthProvider>
        <TestRoleCheck />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-superadmin')).toHaveTextContent('Yes');
      expect(screen.getByTestId('has-viewer')).toHaveTextContent('No');
    });
  });
});

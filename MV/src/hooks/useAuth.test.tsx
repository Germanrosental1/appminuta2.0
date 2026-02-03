import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthContext } from '../contexts/AuthContext';
import { ReactNode } from 'react';

describe('useAuth', () => {
  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth debe ser usado dentro de un AuthProvider');

    consoleErrorSpy.mockRestore();
  });

  it('should return auth context when used inside AuthProvider', () => {
    const mockAuthContext = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        roles: [],
        permissions: [],
      },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      permissions: [],
      roles: [],
      hasPermission: vi.fn(() => false),
      hasAnyPermission: vi.fn(() => false),
      hasAllPermissions: vi.fn(() => false),
      hasRole: vi.fn(() => false),
      refreshRoles: vi.fn(),
      isSuperAdminMV: false,
      isAdminMV: false,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext as any}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBe(mockAuthContext);
    expect(result.current.user).toEqual({
      id: 'test-user-id',
      email: 'test@example.com',
      roles: [],
      permissions: [],
    });
  });

  it('should access auth methods from context', () => {
    const signInMock = vi.fn();
    const signOutMock = vi.fn();
    const hasPermissionMock = vi.fn((perm: string) => perm === 'test_permission');

    const mockAuthContext = {
      user: null,
      loading: false,
      signIn: signInMock,
      signOut: signOutMock,
      permissions: [],
      roles: [],
      hasPermission: hasPermissionMock,
      hasAnyPermission: vi.fn(() => false),
      hasAllPermissions: vi.fn(() => false),
      hasRole: vi.fn(() => false),
      refreshRoles: vi.fn(),
      isSuperAdminMV: false,
      isAdminMV: false,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext as any}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Test permission check
    expect(result.current.hasPermission('test_permission')).toBe(true);
    expect(result.current.hasPermission('other_permission')).toBe(false);

    // Verify methods are accessible
    expect(result.current.signIn).toBe(signInMock);
    expect(result.current.signOut).toBe(signOutMock);
  });

  it('should reflect loading state from context', () => {
    const mockAuthContext = {
      user: null,
      loading: true,
      signIn: vi.fn(),
      signOut: vi.fn(),
      permissions: [],
      roles: [],
      hasPermission: vi.fn(() => false),
      hasAnyPermission: vi.fn(() => false),
      hasAllPermissions: vi.fn(() => false),
      hasRole: vi.fn(() => false),
      refreshRoles: vi.fn(),
      isSuperAdminMV: false,
      isAdminMV: false,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext as any}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
  });

  it('should expose role helper properties', () => {
    const mockAuthContext = {
      user: {
        id: 'admin-user',
        email: 'admin@example.com',
        roles: [{ id: '1', nombre: 'adminmv', created_at: '' }],
        permissions: [],
      },
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      permissions: [],
      roles: [{ id: '1', nombre: 'adminmv', created_at: '' }],
      hasPermission: vi.fn(() => false),
      hasAnyPermission: vi.fn(() => false),
      hasAllPermissions: vi.fn(() => false),
      hasRole: vi.fn((role: string) => role === 'adminmv'),
      refreshRoles: vi.fn(),
      isSuperAdminMV: false,
      isAdminMV: true,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext as any}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAdminMV).toBe(true);
    expect(result.current.isSuperAdminMV).toBe(false);
    expect(result.current.hasRole('adminmv')).toBe(true);
    expect(result.current.hasRole('viewermv')).toBe(false);
  });
});

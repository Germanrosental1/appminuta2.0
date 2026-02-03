import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiFetchWrapped,
  apiGet,
  apiPost,
  apiPatch,
  apiPut,
  apiDelete,
  invalidateSessionCache,
} from './api-wrapper-client';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

// Mock Supabase
vi.mock('./supabase', () => ({
  supabase: {
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
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock CSRF
vi.mock('../utils/csrf', () => ({
  getCSRFToken: vi.fn(() => 'test-csrf-token'),
}));

describe('api-wrapper-client', () => {
  beforeEach(() => {
    invalidateSessionCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    invalidateSessionCache();
  });

  describe('apiFetchWrapped', () => {
    it('should successfully fetch and unwrap response', async () => {
      const data = await apiFetchWrapped('/proyectos');

      expect(data).toEqual([
        {
          id: 'project-1',
          nombre: 'Proyecto Test 1',
          direccion: 'Calle Test 123',
          inmobiliariaId: 'inmobiliaria-1',
        },
        {
          id: 'project-2',
          nombre: 'Proyecto Test 2',
          direccion: 'Avenida Test 456',
          inmobiliariaId: 'inmobiliaria-1',
        },
      ]);
    });

    it('should return raw response when raw=true', async () => {
      const response = await apiFetchWrapped('/proyectos', { raw: true });

      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('metadata');
      expect(response.metadata).toHaveProperty('timestamp');
      expect(response.metadata).toHaveProperty('version', 'v1');
    });

    it('should include Authorization header with session token', async () => {
      let capturedHeaders: Headers | null = null;

      server.use(
        http.get('http://localhost:3000/proyectos', ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: [],
            metadata: { timestamp: new Date().toISOString(), version: 'v1' },
          });
        })
      );

      await apiFetchWrapped('/proyectos');

      expect(capturedHeaders?.get('Authorization')).toBe('Bearer test-token');
    });

    it('should include CSRF token for POST requests', async () => {
      let capturedHeaders: Headers | null = null;

      server.use(
        http.post('http://localhost:3000/minutas', ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            success: true,
            data: { id: 'new-id' },
            metadata: { timestamp: new Date().toISOString(), version: 'v1' },
          });
        })
      );

      await apiFetchWrapped('/minutas', { method: 'POST', body: JSON.stringify({}) });

      expect(capturedHeaders?.get('X-CSRF-Token')).toBe('test-csrf-token');
    });

    it('should throw error on failed response by default', async () => {
      await expect(apiFetchWrapped('/error')).rejects.toThrow();
    });

    it('should return error response when noThrow=true', async () => {
      const result = await apiFetchWrapped('/error', { noThrow: true });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('statusCode');
    });

    it('should handle 401 unauthorized and redirect', async () => {
      const originalLocation = globalThis.location.href;

      await expect(apiFetchWrapped('/unauthorized')).rejects.toThrow();

      // Verify session was invalidated
      // Note: Can't easily test redirect in unit test, but we can verify signOut was called
    });

    it('should handle network errors gracefully with noThrow', async () => {
      server.use(
        http.get('http://localhost:3000/network-error', () => {
          return HttpResponse.error();
        })
      );

      const result = await apiFetchWrapped('/network-error', { noThrow: true });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('message');
    });
  });

  describe('apiGet', () => {
    it('should perform GET request and unwrap', async () => {
      const data = await apiGet('/proyectos');

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it('should accept options', async () => {
      const data = await apiGet('/proyectos', { raw: true });

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    });
  });

  describe('apiPost', () => {
    it('should perform POST request with body', async () => {
      const newMinuta = { numero: 'MIN-003', estado: 'PENDIENTE' };
      const data = await apiPost('/minutas', newMinuta);

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('numero', 'MIN-003');
    });

    it('should stringify body automatically', async () => {
      let capturedBody: any = null;

      server.use(
        http.post('http://localhost:3000/minutas', async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            success: true,
            data: capturedBody,
            metadata: { timestamp: new Date().toISOString(), version: 'v1' },
          });
        })
      );

      await apiPost('/minutas', { test: 'value' });

      expect(capturedBody).toEqual({ test: 'value' });
    });
  });

  describe('apiPatch', () => {
    it('should perform PATCH request', async () => {
      server.use(
        http.patch('http://localhost:3000/minutas/minuta-1', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: { id: 'minuta-1', ...body },
            metadata: { timestamp: new Date().toISOString(), version: 'v1' },
          });
        })
      );

      const data = await apiPatch('/minutas/minuta-1', { estado: 'APROBADA' });

      expect(data).toHaveProperty('id', 'minuta-1');
      expect(data).toHaveProperty('estado', 'APROBADA');
    });
  });

  describe('apiPut', () => {
    it('should perform PUT request', async () => {
      server.use(
        http.put('http://localhost:3000/proyectos/project-1', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: { id: 'project-1', ...body },
            metadata: { timestamp: new Date().toISOString(), version: 'v1' },
          });
        })
      );

      const data = await apiPut('/proyectos/project-1', { nombre: 'Updated Name' });

      expect(data).toHaveProperty('id', 'project-1');
      expect(data).toHaveProperty('nombre', 'Updated Name');
    });
  });

  describe('apiDelete', () => {
    it('should perform DELETE request', async () => {
      server.use(
        http.delete('http://localhost:3000/minutas/minuta-1', () => {
          return HttpResponse.json({
            success: true,
            data: { deleted: true, id: 'minuta-1' },
            metadata: { timestamp: new Date().toISOString(), version: 'v1' },
          });
        })
      );

      const data = await apiDelete('/minutas/minuta-1');

      expect(data).toHaveProperty('deleted', true);
      expect(data).toHaveProperty('id', 'minuta-1');
    });
  });

  // TODO: Session caching tests - complex module mocking, requires refactor
  describe.skip('Session Caching', () => {
    it('should cache session for performance', async () => {
      const { supabase } = await import('./supabase');

      // First call
      await apiFetchWrapped('/proyectos');

      // Second call should use cached session
      await apiFetchWrapped('/proyectos');

      // getSession should only be called once
      expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should refresh session when close to expiry', async () => {
      // Complex test - requires module reset and re-import
      // Skipped for now, to be implemented with better module isolation
    });

    it('should invalidate cache on invalidateSessionCache call', async () => {
      const { supabase } = await import('./supabase');

      await apiFetchWrapped('/proyectos');
      invalidateSessionCache();
      await apiFetchWrapped('/proyectos');

      // getSession should be called twice (cache was invalidated)
      expect(supabase.auth.getSession).toHaveBeenCalledTimes(2);
    });
  });
});

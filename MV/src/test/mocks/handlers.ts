import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000';

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/auth/login`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'ADMIN',
        },
        session: {
          access_token: 'test-token',
          expires_at: Date.now() + 3600000,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  // Projects endpoints
  http.get(`${API_URL}/proyectos`, () => {
    return HttpResponse.json({
      success: true,
      data: [
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
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  http.get(`${API_URL}/proyectos/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        nombre: `Proyecto Test ${params.id}`,
        direccion: 'Calle Test 123',
        inmobiliariaId: 'inmobiliaria-1',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  // Minutas endpoints
  http.get(`${API_URL}/minutas`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'minuta-1',
          numero: 'MIN-001',
          estado: 'APROBADA',
          proyectoId: 'project-1',
          precioTotal: 150000000,
        },
        {
          id: 'minuta-2',
          numero: 'MIN-002',
          estado: 'PENDIENTE',
          proyectoId: 'project-1',
          precioTotal: 200000000,
        },
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  http.post(`${API_URL}/minutas`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id: 'new-minuta-id',
        numero: 'MIN-003',
        ...body,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  // Unidades endpoints
  http.get(`${API_URL}/unidades`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'unidad-1',
          numero: '101',
          proyectoId: 'project-1',
          disponible: true,
        },
        {
          id: 'unidad-2',
          numero: '102',
          proyectoId: 'project-1',
          disponible: false,
        },
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  // Error handlers
  http.get(`${API_URL}/error`, () => {
    return HttpResponse.json(
      {
        success: false,
        message: 'Test error',
        statusCode: 500,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }),

  http.get(`${API_URL}/unauthorized`, () => {
    return HttpResponse.json(
      {
        success: false,
        message: 'Unauthorized',
        statusCode: 401,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 401 }
    );
  }),
];

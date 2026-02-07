import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000';

export const handlers = [
  // UIF Clients endpoints
  http.get(`${API_URL}/uif/clients`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'client-1',
          nombre: 'Cliente Test 1',
          rut: '12345678-9',
          email: 'cliente1@test.com',
        },
        {
          id: 'client-2',
          nombre: 'Cliente Test 2',
          rut: '98765432-1',
          email: 'cliente2@test.com',
        },
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  http.get(`${API_URL}/uif/clients/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        nombre: `Cliente Test ${params.id}`,
        rut: '12345678-9',
        email: 'test@example.com',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  http.post(`${API_URL}/uif/clients`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id: 'new-client-id',
        ...body,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  // UIF Documents endpoints
  http.get(`${API_URL}/uif/documents`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'doc-1',
          client_id: 'client-1',
          filename: 'document1.pdf',
          status: 'pending',
        },
        {
          id: 'doc-2',
          client_id: 'client-1',
          filename: 'document2.pdf',
          status: 'analyzed',
        },
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  http.post(`${API_URL}/uif/documents`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id: 'new-doc-id',
        ...body,
        status: 'pending',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  // UIF Analyses endpoints
  http.get(`${API_URL}/uif/analyses`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'analysis-1',
          client_id: 'client-1',
          status: 'completed',
          risk_level: 'low',
        },
        {
          id: 'analysis-2',
          client_id: 'client-2',
          status: 'pending',
          risk_level: null,
        },
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    });
  }),

  http.get(`${API_URL}/uif/analyses/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        client_id: 'client-1',
        status: 'completed',
        risk_level: 'low',
      },
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

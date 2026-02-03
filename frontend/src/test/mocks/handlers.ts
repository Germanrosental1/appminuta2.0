import { http, HttpResponse } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const handlers = [
    // Health check
    http.get(`${API_URL}/health`, () => {
        return HttpResponse.json({
            success: true,
            data: { status: 'ok' },
            metadata: {
                timestamp: new Date().toISOString(),
                path: '/health',
                method: 'GET',
            },
        });
    }),

    // Minutas endpoints - definitivas list
    http.get(`${API_URL}/minutas/definitivas/definitivas`, () => {
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

    // Generic minutas endpoint (for other paths)
    http.get(`${API_URL}/minutas/definitivas`, () => {
        return HttpResponse.json({
            success: true,
            data: [],
            metadata: {
                timestamp: new Date().toISOString(),
                path: '/minutas/definitivas',
                method: 'GET',
            },
        });
    }),

    // Single minuta by ID
    http.get(`${API_URL}/minutas/definitivas/:id`, ({ params }) => {
        return HttpResponse.json({
            success: true,
            data: {
                id: params.id,
                estado: 'pendiente',
                fechaCreacion: new Date().toISOString(),
            },
            metadata: {
                timestamp: new Date().toISOString(),
                path: `/minutas/definitivas/${params.id}`,
                method: 'GET',
            },
        });
    }),

    // Create minuta
    http.post(`${API_URL}/minutas/definitivas`, async ({ request }) => {
        const body = await request.json() as any;
        return HttpResponse.json({
            success: true,
            data: {
                id: 'mock-id-123',
                ...body,
                fechaCreacion: new Date().toISOString(),
            },
            metadata: {
                timestamp: new Date().toISOString(),
                path: '/minutas/definitivas',
                method: 'POST',
            },
        }, { status: 201 });
    }),

    // Error endpoint for testing
    http.get(`${API_URL}/error`, () => {
        return HttpResponse.json({
            success: false,
            message: 'Test error',
            statusCode: 400,
        }, { status: 400 });
    }),

    // Unauthorized endpoint for testing
    http.get(`${API_URL}/unauthorized`, () => {
        return HttpResponse.json({
            success: false,
            message: 'Unauthorized',
            statusCode: 401,
        }, { status: 401 });
    }),

    // Auth endpoints
    http.post(`${API_URL}/auth/login`, async ({ request }) => {
        const body = await request.json() as any;
        return HttpResponse.json({
            success: true,
            data: {
                access_token: 'mock-token',
                user: {
                    id: 'user-123',
                    email: body.email,
                    role: 'adminmv',
                },
            },
            metadata: {
                timestamp: new Date().toISOString(),
                path: '/auth/login',
                method: 'POST',
            },
        });
    }),
];

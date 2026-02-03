import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/**
 * Configuración de Swagger/OpenAPI con soporte para ApiResponse<T>
 *
 * DOCUMENTACIÓN:
 * - Todos los endpoints documentados con ApiResponse<T> wrapper
 * - Ejemplos de request/response
 * - Autenticación con Bearer token
 * - Versionado de API
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AppMinuta API')
    .setDescription(`
# API de Gestión de Minutas

Esta API utiliza un formato de respuesta estandarizado para todos los endpoints.

## Formato de Respuesta

### Respuestas Exitosas
Todas las respuestas exitosas tienen la siguiente estructura:

\`\`\`json
{
  "success": true,
  "message": "Mensaje opcional descriptivo",
  "data": { /* Datos específicos del endpoint */ },
  "metadata": {
    "timestamp": "2026-02-02T10:30:00.000Z",
    "version": "v1",
    "path": "/api/minutas",
    "method": "GET",
    "duration": 145,
    "requestId": "req_abc123"
  }
}
\`\`\`

---

## Sistema de Permisos

La API utiliza un sistema de permisos granular basado en roles.

### Permisos Disponibles

| Permiso | Descripción | Roles con Acceso |
|---------|-------------|------------------|
| \`verMinutas\` | Ver minutas del proyecto asignado | Todos los usuarios |
| \`generarMinuta\` | Crear nuevas minutas | Vendedor, Administrador |
| \`editarMinuta\` | Editar minutas propias | Vendedor, Administrador |
| \`aprobarRechazarMinuta\` | Cambiar estado a Definitiva/Rechazada | Supervisor, Administrador |
| \`gestionarUnidades\` | CRUD de unidades inmobiliarias | Administrador |
| \`gestionarProyectos\` | CRUD de proyectos | Administrador |
| \`verReportes\` | Acceso a reportes y analytics | Supervisor, Administrador |

---

## Seguridad

### Autenticación
La API utiliza JWT Bearer tokens de Supabase.

### CSRF Protection
Se implementa protección CSRF para todos los requests mutadores (POST, PATCH, DELETE).
- **Header**: \`X-CSRF-Token\`
- **Cookie**: \`XSRF-TOKEN\`

### Headers de Seguridad
El backend incluye automáticamente:
- \`X-Content-Type-Options: nosniff\`
- \`X-Frame-Options: DENY\`
- \`X-XSS-Protection: 1; mode=block\`
- \`Strict-Transport-Security: max-age=31536000\`

---

## Rate Limiting (Throttling)

Los endpoints tienen los siguientes límites por dirección IP:

| Tipo | Límite | Ventana (TTL) |
|------|--------|---------------|
| **Lectura (GET)** | 100 req | 60s |
| **Escritura (POST/PATCH)** | 20 req | 60s |
| **Costosas (PDF)** | 5 req | 60s |
| **Importación masiva** | 3 req | 60s |

---

## Versionado

Versión actual: **v1** (Basado en \`metadata.version\`).
`)
    .setVersion('1.0')
    .setContact(
      'Equipo de Desarrollo',
      'https://example.com',
      'dev@example.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Token JWT de Supabase',
        in: 'header',
      },
      'bearer' // Este es el nombre que usamos en @ApiBearerAuth()
    )
    .addTag('Minutas', 'Endpoints para gestión de minutas de venta')
    .addTag('Unidades', 'Endpoints para gestión de unidades inmobiliarias')
    .addTag('Proyectos', 'Endpoints para gestión de proyectos')
    .addTag('Auth', 'Endpoints de autenticación y autorización')
    .addServer('http://localhost:3000', 'Desarrollo local')
    .addServer('https://api.example.com', 'Producción')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // Opciones adicionales
    deepScanRoutes: true,
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  // Personalizar el documento generado
  // Agregar ejemplos globales de ApiResponse
  if (!document.components) {
    document.components = {};
  }

  if (!document.components.examples) {
    document.components.examples = {};
  }

  // Ejemplo de respuesta exitosa
  document.components.examples['SuccessResponseExample'] = {
    summary: 'Respuesta exitosa típica',
    value: {
      success: true,
      message: 'Operación completada exitosamente',
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        numero: 'MIN-2026-001',
        estado: 'Provisoria',
        clienteNombre: 'Juan Pérez',
      },
      metadata: {
        timestamp: '2026-02-02T10:30:00.000Z',
        version: 'v1',
        path: '/api/minutas',
        method: 'POST',
        duration: 245,
      },
    },
  };

  // Ejemplo de respuesta de error
  document.components.examples['ErrorResponseExample'] = {
    summary: 'Respuesta de error típica',
    value: {
      success: false,
      message: 'Minuta no encontrada',
      statusCode: 404,
      errorCode: 'MINUTA_NOT_FOUND',
      metadata: {
        timestamp: '2026-02-02T10:30:00.000Z',
        version: 'v1',
        path: '/api/minutas/123',
        method: 'GET',
      },
    },
  };

  // Ejemplo de respuesta paginada
  document.components.examples['PaginatedResponseExample'] = {
    summary: 'Respuesta paginada típica',
    value: {
      success: true,
      data: {
        items: [
          { id: '1', numero: 'MIN-001', clienteNombre: 'Cliente 1' },
          { id: '2', numero: 'MIN-002', clienteNombre: 'Cliente 2' },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 150,
          totalPages: 8,
          hasNext: true,
          hasPrev: false,
        },
      },
      metadata: {
        timestamp: '2026-02-02T10:30:00.000Z',
        version: 'v1',
        path: '/api/minutas/paginated',
        method: 'GET',
        duration: 145,
      },
    },
  };

  // Configurar Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Recordar token entre recargas
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'list', // Mostrar solo tags expandidos
      filter: true, // Habilitar búsqueda
      displayRequestDuration: true, // Mostrar duración de requests
      tryItOutEnabled: true,
    },
    customSiteTitle: 'AppMinuta API Docs',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 2em; }
    `,
  });

  console.log('Swagger documentation available at: /api/docs');
}

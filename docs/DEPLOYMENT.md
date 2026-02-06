# Guía de Despliegue - AppMinuta

Esta guía detalla el proceso de despliegue para los distintos componentes del sistema.

## 🏗 Arquitectura de Despliegue

- **Frontend**: SPA servida estáticamente (Vercel, Netlify, o S3+CloudFront).
- **Backend**: Contenedor Docker (Railway, AWS ECS, DigitalOcean App Platform).
- **Base de Datos**: PostgreSQL gestionado (Supabase, AWS RDS).
- **Auth**: Supabase Auth (Externo).

## 🚀 Frontend Deployment

### Build
El frontend usa Vite para construir la aplicación optimizada.

```bash
cd frontend
npm ci
npm run build
```

El resultado estará en `frontend/dist`.

### Configuración Nginx (Ejemplo Docker)
Para servir el frontend con Docker:

```dockerfile
FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🚀 Backend Deployment

### Dockerfile
El backend incluye un `Dockerfile` optimizado (Multi-stage build).

```bash
docker build -t appminuta-api ./backend
docker run -p 3000:3000 --env-file .env appminuta-api
```

### Variables de Entorno Requeridas en Producción
- `DATABASE_URL`: Connection string de Postgres (Pooling mode recomendado).
- `JWT_SECRET`: Clave secreta robusta.
- `CORS_ORIGIN`: URL del frontend (ej. `https://appminuta.com`).
- `NODE_ENV`: `production`.

## 🔄 CI/CD Pipeline (Recomendado)

Se recomienda configurar GitHub Actions para:
1.  **CI**: Correr tests y linter en cada Push.
2.  **CD**: Build de imagen Docker y Push a Registry (GHCR/ECR) al mergear a `main`.
3.  **Deploy**: Trigger de redeploy en el proveedor de nube.

## 🩺 Health Checks

- Backend: `/api/health` (o raíz `/`) debe responder 200 OK.
- Frontend: Carga de `index.html` y assets.

---
© 2026 AppMinuta Team

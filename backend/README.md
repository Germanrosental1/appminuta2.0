# AppMinuta Backend (API)

API RESTful desarrollada en NestJS para gestionar la lógica de negocio de AppMinuta, incluyendo la gestión de minutas, firmantes, y reglas de negocio inmobiliarias.

## 🛠 Stack Tecnológico

- **Framework**: NestJS (Modular Architecture)
- **Lenguaje**: TypeScript
- **ORM**: Prisma (PostgreSQL)
- **Auth**: JWT (Passport Strategies)
- **Validación**: Class-Validator
- **Docs**: Swagger / OpenAPI
- **Seguridad**: Helmet, Rate Limiting, CORS, HSTS

## ⚙️ Estructura del Proyecto

```
src/
├── auth/           # Módulo de Autenticación y Autorización
├── common/         # Decorators, Guards, Interceptors, DTOs compartidos
├── minutas/        # Módulo Core de Minutas
├── prisma/         # Servicio de Base de Datos
├── shared/         # Módulos compartidos (Unidades, Firmantes, etc.)
└── main.ts         # Entry point (Bootstrap)
```

## 🚀 Configuración y Ejecución

### 1. Variables de Entorno

Crear archivo `.env` en la raíz de `backend/`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/appminuta?schema=public"

# Auth
JWT_SECRET="super-secret-key"
JWT_EXPIRATION="12h"

# App
PORT=3000
NODE_ENV=development

# Cors
CORS_ORIGIN=http://localhost:8080
```

### 2. Base de Datos

```bash
# Generar cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Popular base de datos (Seed)
npm run seed
```

### 3. Correr Servidor

```bash
# Desarrollo con watch mode
npm run start:dev

# Producción
npm run start:prod
```

## 🧪 Testing

El proyecto cuenta con testing unitario y de cobertura con Jest.

```bash
# Ejecutar tests unitarios
npm test

# Ver reporte de cobertura
npm run test:cov
# Umbrales actuales: ~15% (Mejorando)
```

## 🔒 Auditoría y Seguridad

- **Logs**: Se registran eventos de login exitosos y fallidos (`AuthLogger`).
- **Seguridad**: Se aplican headers de seguridad con Helmet y Rate Limiting para prevenir fuerza bruta.
- **Auditoría**: `npm audit` se corre regularmente (actualmente 0 vulnerabilidades críticas).

## 📄 Documentación API

La documentación interactiva Swagger está disponible en `/api/docs` cuando la aplicación está corriendo.

---
© 2026 AppMinuta Backend Team

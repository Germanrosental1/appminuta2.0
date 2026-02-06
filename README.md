# AppMinuta Monorepo

Sistema integral para la gestión y generación de minutas comerciales inmobiliarias. Este repositorio sigue una arquitectura de monorepo que alberga tanto el frontend, backend como servicios auxiliares.

## 🏗 Estructura del Proyecto

El proyecto está organizado en los siguientes paquetes principales:

| Directorio | Descripción | Stack Tecnológico |
|------------|-------------|-------------------|
| `frontend/` | Aplicación Web SPA (Dashboards, Wizard) | React, Vite, TypeScript, Tailwind |
| `backend/` | API RESTful y Lógica de Negocio | NestJS, Prisma, PostgreSQL |
| `MV/` | Microservicio de Minutas (Legacy/Integration) | Node.js |
| `uif/` | Servicio de Integración Financiera | Node.js / Integration Scripts |

## 🚀 Requisitos Previos

- **Node.js**: v18+
- **Docker**: (Opcional) Para correr base de datos localmente.
- **PostgreSQL**: Base de datos principal.

## 🛠 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/Germanrosental1/appminuta.git
cd appminuta
```

### 2. Configurar Variables de Entorno
Cada proyecto requiere su propio archivo `.env`. Consulte los `README` específicos de cada directorio para más detalles, o copie los ejemplos:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Instalar Dependencias
Se recomienda instalar las dependencias en cada proyecto individualmente por ahora:

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

## 🏃‍♂️ Ejecución

### Backend (API)
```bash
cd backend
npm run start:dev
# Corre en http://localhost:3000
```

### Frontend (App)
```bash
cd frontend
npm run dev
# Corre en http://localhost:8080
```

## 🧪 Testing

El proyecto cuenta con suites de tests unitarios, de integración y E2E.

```bash
# Backend Tests
cd backend && npm test

# Frontend Unit Tests
cd frontend && npm test

# Frontend E2E Tests (Playwright)
cd frontend && npx playwright test
```

## 🔐 Seguridad

Este proyecto implementa varias capas de seguridad:
- **Helmet & CSP**: Protección contra XSS y ataques de inyección.
- **Rate Limiting**: Protección contra fuerza bruta.
- **Audit Logging**: Registro detallado de acciones críticas.
- **Type Safety**: Uso estricto de TypeScript en todo el stack.

## 📄 Documentación Adicional

- [Backend Documentation](./backend/README.md) (Pendiente)
- [Frontend Documentation](./frontend/README.md) (Pendiente)
- [API Swagger](http://localhost:3000/api/docs) (Disponible al correr el backend)

---
© 2026 AppMinuta Team

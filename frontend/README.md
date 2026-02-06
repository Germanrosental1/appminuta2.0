# AppMinuta Frontend

Aplicación Web SPA moderna construida con React, TypeScript y Vite. Proporciona la interfaz interactiva para el Wizard de Minutas, Dashboards de Roles y gestión administrativa.

## 🛠 Stack Tecnológico

- **Core**: React 18, TypeScript
- **Build**: Vite (SWC)
- **Styling**: TailwindCSS, Shadcn/UI
- **State**: React Query (TanStack Query), Context API
- **Routing**: React Router Dom v6
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest, React Testing Library, Playwright

## ⚙️ Estructura del Proyecto

```
src/
├── components/     # UI Kit y Componentes reutilizables
├── context/        # Estado Global (Auth, Wizard)
├── hooks/          # Custom Hooks (Lógica de negocio)
├── lib/            # Utilidades y configuración de librerías
├── pages/          # Vistas principales (Rutas)
├── services/       # Capa de comunicación con API
├── test/           # Configuración de Tests
└── utils/          # Helpers puros
e2e/                # Tests End-to-End con Playwright
```

## 🚀 Configuración y Ejecución

### 1. Variables de Entorno

Crear archivo `.env` en `frontend/`:

```env
VITE_API_URL="http://localhost:3000/api"
VITE_SUPABASE_URL="https://xxx.supabase.co"
VITE_SUPABASE_ANON_KEY="xxx"
```

### 2. Instalación

```bash
npm install
```

### 3. Ejecución Local (Dev)

```bash
npm run dev
# Disponible en http://localhost:8080
```

## 🧪 Testing

Este proyecto utiliza una estrategia de testing piramidal:

### Unit & Component Tests (Vitest)
```bash
# Correr tests unitarios
npm test

# Ver reporte de cobertura
npm run test:coverage
```

### End-to-End Tests (Playwright)
```bash
# Ejecutar tests E2E (requiere servidor corriendo o auto-start)
npx playwright test

# Ver reporte HTML
npx playwright show-report
```

## 📦 Build y Despliegue

```bash
# Construir para producción
npm run build

# Previsualizar build localmente
npm run preview
```

## 🔒 Buenas Prácticas

- **Performance**: Lazy loading de rutas y componentes pesados.
- **Seguridad**: Sanitización de inputs, CSP headers configurados.
- **Accesibilidad**: Componentes base accesibles (Radix UI).

---
© 2026 AppMinuta Frontend Team

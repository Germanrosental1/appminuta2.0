# Documentación Técnica - Generador de Minutas Comerciales

## 1. Descripción General

El Generador de Minutas Comerciales es una aplicación web profesional diseñada para la creación, gestión y seguimiento de minutas comerciales inmobiliarias. La aplicación permite a los usuarios comerciales crear minutas a través de un wizard intuitivo de 6 pasos, mientras que los usuarios administrativos pueden revisar, aprobar y gestionar las minutas creadas.

## 2. Stack Tecnológico

### 2.1 Frontend
- **Framework principal**: React 18 con TypeScript
- **Build tool**: Vite
- **Estilos**: Tailwind CSS
- **Componentes UI**: shadcn/ui (basado en Radix UI)
- **Enrutamiento**: React Router v6
- **Gestión de estado**:
  - Context API para estado global
  - React Query para fetching de datos
- **Formularios**: React Hook Form con Zod para validaciones
- **Notificaciones**: Sonner (toasts)
- **Generación de PDFs**: jspdf, html2canvas, react-to-pdf
- **Gráficos**: Recharts

### 2.2 Backend
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **API**: RESTful con Supabase Client
- **Generación de documentos**: Webhook n8n (servicio externo)

## 3. Estructura del Proyecto

```
minuta-generator-main/
├── src/
│   ├── components/       # Componentes React
│   │   ├── auth/         # Componentes de autenticación
│   │   ├── minutas/      # Componentes específicos de minutas
│   │   ├── ui/           # Componentes de UI reutilizables
│   │   ├── unidades/     # Componentes relacionados con unidades
│   │   └── wizard/       # Componentes del wizard de creación
│   │       └── steps/    # Pasos individuales del wizard
│   ├── context/          # Contextos de React (estado global)
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilidades y configuraciones
│   ├── pages/            # Páginas/rutas de la aplicación
│   │   ├── admin/        # Páginas de administración
│   │   ├── comercial/    # Páginas para usuarios comerciales
│   │   └── error/        # Páginas de error
│   ├── services/         # Servicios de API
│   ├── types/            # Definiciones de tipos TypeScript
│   └── utils/            # Funciones utilitarias
├── public/               # Archivos estáticos
└── docs/                 # Documentación
```

## 4. Módulos Principales

### 4.1 Sistema de Autenticación

El sistema utiliza Supabase Auth para la autenticación de usuarios. Los roles principales son:

- **Comercial**: Usuarios que crean minutas
- **Administración**: Usuarios que revisan y aprueban minutas

La configuración de autenticación se encuentra en `src/lib/supabase.ts` y se gestiona a través del contexto `AuthContext`.

### 4.2 Wizard de Minutas

El wizard es el componente central de la aplicación, permitiendo la creación paso a paso de minutas comerciales. Consta de 6 pasos:

1. **Proyecto & Unidad**: Selección de proyecto, unidad y fecha de posesión
2. **Datos Comerciales**: Precio de lista, precio negociado y cálculo de descuento
3. **Composición A/B**: División en dos partes con diferentes monedas
4. **Estructura de Pago**: Configuración de financiamiento y cuotas
5. **Cargos y Extras**: Sellados, alhajamiento, comisiones y extras
6. **Tipo de Cambio & Salida**: Configuración final y generación del documento

El estado del wizard se gestiona a través del contexto `WizardContext` y los datos se guardan automáticamente en localStorage como borrador.

### 4.3 Gestión de Minutas

Las minutas se dividen en dos tipos:

- **Minutas Provisorias**: Creadas por usuarios comerciales, pendientes de revisión
- **Minutas Definitivas**: Aprobadas por administración, representan documentos finales

Los componentes para la gestión de minutas se encuentran en `src/components/minutas/` y las operaciones CRUD se implementan en `src/services/minutas.ts`.

### 4.4 Integración con n8n

La aplicación utiliza un webhook de n8n para la generación de documentos PDF/XLSX. La configuración del webhook se realiza a través de variables de entorno y la integración se implementa en `src/services/api.ts`.

## 5. Flujos de Datos

### 5.1 Creación de Minutas

1. El usuario comercial completa el wizard de 6 pasos
2. Los datos se validan en tiempo real con Zod
3. Al finalizar, se envía la información al backend (Supabase)
4. Se guarda como minuta provisoria en la tabla `minutas_provisorias`
5. Opcionalmente, se genera un documento a través del webhook de n8n

### 5.2 Revisión y Aprobación

1. El usuario de administración visualiza las minutas provisorias pendientes
2. Puede revisar los detalles de cada minuta en un modal
3. Puede aprobar, rechazar o solicitar cambios
4. Al aprobar, se crea una minuta definitiva en la tabla `minutas_definitivas`

### 5.3 Generación de Documentos

1. Se envían los datos completos de la minuta al webhook de n8n
2. n8n procesa la información y genera un documento PDF o XLSX
3. El documento se devuelve como respuesta binaria
4. El frontend descarga automáticamente el archivo generado

## 6. Modelo de Datos

### 6.1 Tablas Principales

- **profiles**: Usuarios y sus roles
- **minutas_provisorias**: Minutas en proceso de revisión
- **minutas_definitivas**: Minutas aprobadas y finalizadas
- **mapadeventas**: Datos complementarios para las unidades

### 6.2 Estructura de Datos de Minutas

La estructura completa de datos de una minuta se define en `src/types/wizard.ts` e incluye:

- Información del proyecto y unidad
- Precios y descuentos
- Composición A/B con diferentes monedas
- Estructura de financiamiento
- Cargos adicionales
- Reglas de financiación
- Configuración de salida

## 7. Características de Seguridad

- Autenticación basada en JWT con Supabase
- Row Level Security (RLS) en tablas de Supabase
- Validación de datos con Zod tanto en cliente como servidor
- Sanitización de inputs
- Variables de entorno para secrets y configuraciones sensibles

## 8. Modo Demo

La aplicación incluye un modo demo que permite:

- Simular la generación de documentos sin conectar al webhook
- Generar archivos de prueba en formato texto plano
- Probar todas las funcionalidades sin afectar datos reales

Se activa mediante el toggle "Modo Demo" en el header del wizard.

## 9. Responsive Design

La aplicación está diseñada para ser completamente responsive:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

Utiliza Tailwind CSS para implementar un diseño adaptable a diferentes dispositivos.

## 10. Design System

### 10.1 Colores Principales

- **Primary**: Azul corporativo (#1E88E5)
- **Success**: Verde (#2E7D32)
- **Warning**: Amarillo (#F57C00)
- **Destructive**: Rojo (#E53935)

Los colores están definidos en `src/index.css` usando HSL y variables semánticas.

### 10.2 Componentes UI

La aplicación utiliza shadcn/ui, una colección de componentes reutilizables construidos sobre Radix UI:

- Formularios: Input, Select, Checkbox, etc.
- Feedback: Toast, Alert, Dialog
- Layout: Card, Sheet, Tabs
- Navigation: Dropdown, Menu, Sidebar

## 11. Configuración y Despliegue

### 11.1 Variables de Entorno

La aplicación requiere las siguientes variables de entorno:

```
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

### 11.2 Instalación y Desarrollo

```bash
# Instalación de dependencias
npm install

# Desarrollo con hot-reload
npm run dev

# Compilación para producción
npm run build
```

### 11.3 Despliegue

El proyecto está configurado para ser desplegado a través de Lovable:

1. Abrir [Lovable](https://lovable.dev/projects/74b977ee-f682-4ca5-aa89-02bdec0c9044)
2. Hacer clic en Share -> Publish
3. Opcionalmente, configurar un dominio personalizado en Project > Settings > Domains

## 12. Futuras Mejoras

- Implementación de validación server-side en n8n
- Integración con sistemas de firma digital
- Dashboard analítico para seguimiento de ventas
- Exportación masiva de minutas
- Sistema de notificaciones en tiempo real

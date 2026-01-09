# Generador de Minutas Comerciales

Sistema profesional para generar minutas comerciales inmobiliarias con validación en tiempo real y descarga de archivos.

## 🚀 Características

- ✅ **Wizard de 6 pasos** con validaciones en tiempo real
- 💾 **Guardado automático** en localStorage (borradores)
- 🔄 **Cálculos automáticos** (descuentos, cuotas, composición A/B)
- 📄 **Generación de PDF/XLSX** desde webhook n8n
- 🧪 **Modo Demo** para testing sin conexión real
- 📱 **Diseño responsive** y accesible
- 🎨 **UI moderna** con design system profesional

## 📋 Flujo del Wizard

### Paso 1: Proyecto & Unidad
- Selección de proyecto
- Selección de unidad
- Fecha de posesión

### Paso 2: Datos Comerciales
- Precio de lista
- Precio negociado (validado ≤ precio lista)
- Cálculo automático de descuento

### Paso 3: Composición A/B
- Modo: porcentaje o importe
- División en dos partes (A y B)
- Selección de monedas (USD/ARS)
- Cálculo automático de parte B

### Paso 4: Estructura de Pago
- Financiado (switch)
- Cantidad de cuotas (1-120)
- Frecuencia (mensual/trimestral)
- Anticipo
- Cálculo de cuota estimada

### Paso 5: Cargos y Extras
- Sellado (%)
- Alhajamiento
- Comisión (%)
- Cocheras (cantidad y valor)

### Paso 6: Tipo de Cambio & Salida
- Tipo de cambio USD → ARS
- Formato (PDF/XLSX)
- Resumen completo
- Generación y descarga

## 🔧 Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

### 2. Instalación

```bash
npm install
npm run dev
```

## 🔗 API (Webhook n8n)

### Request

**Endpoint:** `VITE_N8N_WEBHOOK_URL`  
**Method:** `POST`  
**Content-Type:** `application/json`

**Body:**
```json
{
  "proyecto": "CIMA - Torre 2",
  "unidad": "Piso 7 - Dpto B",
  "fechaPosesion": "2026-03-01",
  "precioLista": 120000,
  "precioNegociado": 112500,
  "modoA": "porcentaje",
  "porcA": 60,
  "impA": null,
  "monedaA": "USD",
  "monedaB": "ARS",
  "financiado": true,
  "cuotas": 12,
  "frecuencia": "mensual",
  "anticipo": 15000,
  "sellado": 0.8,
  "alhajamiento": 350000,
  "comision": 2.0,
  "cocherasCant": 1,
  "cocheraValor": 12000,
  "dolarRef": 1150,
  "formatoSalida": "PDF"
}
```

### Response

**Content-Type:** `application/pdf` o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`  
**Body:** Archivo binario (PDF o XLSX)

El archivo se descargará automáticamente con el nombre:
```
Minuta_{proyecto}_{unidad}_{timestamp}.{pdf|xlsx}
```

## 🧪 Modo Demo

Activa el toggle "Modo Demo" en el header del wizard para:
- Simular la generación sin conectar al webhook
- Generar un archivo de prueba (texto plano)
- Útil para QA y desarrollo sin backend

## ✅ Validaciones

### Reglas Principales:
- `precioNegociado ≤ precioLista`
- Si `modoA = porcentaje`: `0 ≤ porcA ≤ 100`
- Si `modoA = importe`: `0 ≤ impA ≤ precioNegociado`
- Si `financiado = true`: `cuotas ≥ 1`
- `dolarRef > 0`

### Validación en Tiempo Real:
- Errores inline en cada campo
- Botón "Siguiente" deshabilitado si hay errores
- Toasts informativos

## 📦 Tecnologías

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **shadcn/ui** (components)
- **Zod** (validaciones)
- **Context API** (estado global)
- **React Router** (navegación)
- **Sonner** (toasts)

## 🎨 Design System

Colores principales:
- **Primary:** Azul corporativo (#1E88E5)
- **Success:** Verde (#2E7D32)
- **Warning:** Amarillo (#F57C00)
- **Destructive:** Rojo (#E53935)

Todos los colores están definidos en `src/index.css` usando HSL y variables semánticas.

## 📱 Responsive Design

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🔐 Seguridad

- ✅ Validación client-side con Zod
- ✅ Sanitización de inputs
- ✅ Variables de entorno para secrets
- ⚠️ Implementar validación server-side en n8n

## 📄 Licencia

MIT

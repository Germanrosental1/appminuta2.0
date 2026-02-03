# 📋 Inventario de Vistas HTML - AppMinuta 2.0

> **Última actualización**: 2026-02-02  
> **Estado**: ✅ **COMPLETO** - Todos los archivos HTML están disponibles

---

## 📊 Resumen

| Categoría | Cantidad | Estado |
|-----------|----------|--------|
| Login/Auth | 1 | ✅ |
| Paneles (Admin/Comercial/Firmante) | 3 | ✅ |
| Wizard Pasos (1-7) | 8 | ✅ |
| Modal/Componentes | 1 | ✅ |
| Resumen Final | 1 | ✅ |
| **TOTAL** | **14** | ✅ |

---

## 🔐 Autenticación

### Login
- **Carpeta**: [`Login/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/Login)
- **Archivo**: `code.html` (113 líneas, 6.3KB)
- **Descripción**: Página de login con email/password, toggle de visibilidad, links de registro y recuperación

---

## 📊 Paneles de Usuario

### Panel Admin
- **Carpeta**: [`PanelAdmin/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/PanelAdmin)
- **Archivo**: `code.html` (312 líneas, 19.6KB)
- **Descripción**: Dashboard administrativo con sidebar, KPIs, tabla de minutas, filtros y acciones

### Panel Comercial
- **Carpeta**: [`PanelComercial/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/PanelComercial)
- **Archivo**: `code.html` (378 líneas, 23.5KB)
- **Descripción**: Panel comercial con tabla de minutas propias, acciones de edición

### Panel Firmante
- **Carpeta**: [`PanelFirmante/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/PanelFirmante)
- **Archivo**: `code.html` (374 líneas, 25KB)
- **Descripción**: Panel con tabs (Pendientes/Firmadas), tabla de documentos para firma

---

## 🧙 Wizard de Minutas (8 Pasos)

### Paso 1: Proyecto y Unidad
- **Carpeta**: [`paso_1:_proyecto_y_unidad/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/paso_1:_proyecto_y_unidad)
- **Archivo**: `code.html` (276 líneas, 15.4KB)
- **Campos**: Proyecto (select), Tipo Propiedad (cards: Departamento/PH/Local/Cochera), Selección de unidades

### Paso 2: Condiciones Comerciales
- **Carpeta**: [`paso_2:_condiciones_comerciales/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/paso_2:_condiciones_comerciales)
- **Archivo**: `code.html` (267 líneas, 16.8KB)
- **Campos**: Tipo Operación (Venta/Reserva), Precio ($), Tipo Moneda, Fecha operación

### Paso 3: Composición F/SB
- **Carpeta**: [`paso_3:_composición_f/sb/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/paso_3:_composición_f/sb)
- **Archivo**: `code.html` (248 líneas, 14.7KB)
- **Campos**: Distribución F (Facturación) vs SB (Sobre Boleto), porcentajes, cálculos automáticos

### Paso 3.5: Cálculo de IVA
- **Carpeta**: [`paso_3.5:_cálculo_de_iva/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/paso_3.5:_cálculo_de_iva)
- **Archivo**: `code.html` (221 líneas, 12.6KB)
- **Campos**: Toggle aplicar IVA, condiciones de IVA, previsualización de cálculos

### Paso 4: Pago y Anticipos
- **Carpeta**: [`paso_4:_pago_y_anticipos/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/paso_4:_pago_y_anticipos)
- **Archivo**: `code.html` (297 líneas, 16.5KB)
- **Campos**: Monto anticipo, fecha de pago, método de pago, cuotas anticipadas

### Paso 5: Cargos y Gastos
- **Carpeta**: [`paso_5:_cargos_y_gastos/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/paso_5:_cargos_y_gastos)
- **Archivo**: `code.html` (371 líneas, 19.2KB)
- **Campos**: Certificación de firmas, sellado, alhajamiento, planos, otros gastos

### Paso 6: Reglas de Financiación
- **Carpeta**: [`paso_6:_reglas_de_financiación/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/paso_6:_reglas_de_financiación)
- **Archivo**: `code.html` (404 líneas, 23.6KB)
- **Campos**: Saldo a financiar, cantidad de cuotas, periodicidad, tasas de interés

### Paso 7: Datos del Cliente
- **Carpeta**: [`Paso 7/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/Paso%207)
- **Archivo**: `code.html` (194 líneas, 8.7KB)
- **Campos**: Nombre y apellido del cliente, teléfono de contacto

---

## 🔔 Componentes Modales

### Modal de Confirmación
- **Carpeta**: [`ModalConfirmacion/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/ModalConfirmacion)
- **Archivo**: `code.html` (167 líneas, 6.6KB)
- **Descripción**: Modal de resumen con secciones de Cargos & Extras y Reglas de Financiación F/SB

---

## 📄 Resumen Final

### Resumen de Minuta
- **Carpeta**: [`ResumenMInutaa/`](file:///Users/valentinoriva/Rosental/appminuta2.0/vistas/ResumenMInutaa)
- **Archivo**: `code.html` (325 líneas, 17.5KB)
- **Descripción**: Vista consolidada de todos los datos de la minuta para revisión final

---

## 🎨 Stack Tecnológico Común

Todos los archivos HTML utilizan:
- **CSS Framework**: Tailwind CSS v3 (via CDN)
- **Tema**: Dark Mode (`class="dark"`)
- **Fuentes**: Manrope, Noto Sans (Google Fonts)
- **Iconos**: Material Symbols Outlined
- **Layout**: Flexbox/Grid responsive

---

## 📁 Estructura de Archivos

```
vistas/
├── Login/
│   ├── code.html ✅
│   └── screen.png
├── PanelAdmin/
│   ├── code.html ✅
│   └── screen.png
├── PanelComercial/
│   ├── code.html ✅
│   └── screen.png
├── PanelFirmante/
│   ├── code.html ✅
│   └── screen.png
├── paso_1:_proyecto_y_unidad/
│   ├── code.html ✅
│   └── screen.png
├── paso_2:_condiciones_comerciales/
│   ├── code.html ✅
│   └── screen.png
├── paso_3:_composición_f/
│   └── sb/
│       ├── code.html ✅
│       └── screen.png
├── paso_3.5:_cálculo_de_iva/
│   ├── code.html ✅
│   └── screen.png
├── paso_4:_pago_y_anticipos/
│   ├── code.html ✅
│   └── screen.png
├── paso_5:_cargos_y_gastos/
│   ├── code.html ✅
│   └── screen.png
├── paso_6:_reglas_de_financiación/
│   ├── code.html ✅
│   └── screen.png
├── Paso 7/
│   ├── code.html ✅
│   └── screen copy.png
├── ModalConfirmacion/
│   ├── code.html ✅
│   └── screen copy.png
└── ResumenMInutaa/
    ├── code.html ✅
    └── screen.png
```

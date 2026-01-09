# Propuesta de Patrones de Diseño para Backend AppMinuta

## Resumen del Análisis

He analizado el backend completo de AppMinuta (NestJS + Prisma + Supabase) y he identificado oportunidades significativas para mejorar la arquitectura, mantenibilidad y escalabilidad del código mediante la implementación de patrones de diseño establecidos.

### Arquitectura Actual

- **Framework**: NestJS con TypeScript
- **ORM**: Prisma Client
- **Autenticación**: Supabase Auth con JWT Strategy  
- **Módulos principales**: Auth, Minutas, Proyectos, Unidades
- **Base de datos**: PostgreSQL con múltiples esquemas (auth, public)
- **Rate Limiting**: ThrottlerGuard global

---

## Patrones de Diseño Recomendados

### 1. Repository Pattern - Capa de Abstracción de Datos

#### Problema Actual
Los servicios acceden directamente a `PrismaService`, acoplando la lógica de negocio con la implementación específica de Prisma:

```typescript
// minutas.service.ts - líneas 11-17
async create(createMinutaDto: CreateMinutaDto) {
  return this.prisma.minutas_definitivas.create({
    data: {
      ...createMinutaDto,
      fecha_creacion: new Date(),
      updated_at: new Date(),
    } as any, // 🔴 Type casting problemático
  });
}
```

#### Beneficios del Repository Pattern
- ✅ Desacopla la lógica de negocio del ORM
- ✅ Facilita testing con mocks
- ✅ Centraliza queries complejas
- ✅ Permite cambiar el ORM sin afectar servicios
- ✅ Elimina type casting `as any`

#### Implementación Propuesta

```typescript
// repositories/minuta-definitiva.repository.ts
export interface IMinutaDefinitivaRepository {
  create(data: CreateMinutaDto): Promise<MinutaDefinitiva>;
  findById(id: string): Promise<MinutaDefinitiva | null>;
  findAll(query: MinutaQuery): Promise<PaginatedResponse<MinutaDefinitiva>>;
  update(id: string, data: UpdateMinutaDto): Promise<MinutaDefinitiva>;
  delete(id: string): Promise<void>;
}

@Injectable()
export class MinutaDefinitivaRepository implements IMinutaDefinitivaRepository {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMinutaDto): Promise<MinutaDefinitiva> {
    const data = {
      usuario_id: dto.usuario_id,
      proyecto: dto.proyecto,
      estado: dto.estado,
      datos: dto.datos,
      datos_adicionales: dto.datos_adicionales,
      datos_mapa_ventas: dto.datos_mapa_ventas,
      comentarios: dto.comentarios,
      url_documento: dto.url_documento,
      fecha_creacion: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    return this.prisma.minutas_definitivas.create({ data });
  }

  async findAll(query: MinutaQuery): Promise<PaginatedResponse<MinutaDefinitiva>> {
    const where = this.buildWhereClause(query);
    const orderBy = this.buildOrderBy(query);
    
    const [total, items] = await this.prisma.$transaction([
      this.prisma.minutas_definitivas.count({ where }),
      this.prisma.minutas_definitivas.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
      }),
    ]);

    return {
      data: items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private buildWhereClause(query: MinutaQuery) {
    // Lógica centralizada de filtrado
  }
}
```

---

### 2. Result Pattern / Either Pattern - Manejo de Errores

#### Problema Actual
No hay manejo explícito de errores, se confía en excepciones que pueden no ser capturadas:

```typescript
// minutas.service.ts - líneas 104-124
async generate(data: any): Promise<{ buffer: Buffer; contentType: string }> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('N8N_WEBHOOK_URL not configured'); // 🔴 Error genérico
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Error generating document: ${response.statusText}`); // 🔴 Pérdida de información
  }
  // ...
}
```

#### Beneficios del Result Pattern
- ✅ Errores tipados y predecibles
- ✅ Fuerza el manejo explícito de errores
- ✅ Mejor experiencia de debugging
- ✅ Respuestas consistentes al cliente

#### Implementación Propuesta

```typescript
// common/result.ts
export class Result<T, E = Error> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: E,
    private readonly _isSuccess: boolean = true
  ) {}

  static ok<T>(value: T): Result<T> {
    return new Result<T>(value, undefined, true);
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result<never, E>(undefined, error, false);
  }

  isSuccess(): boolean {
    return this._isSuccess;
  }

  isFailure(): boolean {
    return !this._isSuccess;
  }

  getValue(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value from failed result');
    }
    return this._value!;
  }

  getError(): E {
    if (this._isSuccess) {
      throw new Error('Cannot get error from successful result');
    }
    return this._error!;
  }
}

// Uso en servicio
async generate(data: any): Promise<Result<{ buffer: Buffer; contentType: string }, AppError>> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return Result.fail(new ConfigurationError('N8N_WEBHOOK_URL not configured'));
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return Result.fail(new ExternalServiceError(
        `N8N service error: ${response.status} - ${response.statusText}`
      ));
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const buffer = Buffer.from(await response.arrayBuffer());

    return Result.ok({ buffer, contentType });
  } catch (error) {
    return Result.fail(new ExternalServiceError('Failed to communicate with N8N', error));
  }
}

// En el controller
@Post('generar')
async generar(@Body() data: any, @Res() res: Response) {
  const result = await this.minutasService.generate(data);
  
  if (result.isFailure()) {
    const error = result.getError();
    throw new HttpException(error.message, error.httpStatus);
  }

  const { buffer, contentType } = result.getValue();
  res.set('Content-Type', contentType);
  res.send(buffer);
}
```

---

### 3. Value Objects para DTOs - Validación de Dominio

#### Problema Actual
Se usa `any` en varios lugares, perdiendo type safety:

```typescript
// minutas.controller.ts - líneas 21, 26, 31, 38
@Post('provisoria')
createProvisoria(@Body() data: any) { // 🔴 Type: any
  return this.minutasService.createProvisoria(data);
}

@Patch('provisoria/:id')
updateProvisoria(@Param('id') id: string, @Body() data: any) { // 🔴 Type: any
  return this.minutasService.updateProvisoria(id, data);
}
```

#### Beneficios de Value Objects
- ✅ Type safety completo
- ✅ Validación en el constructor
- ✅ Inmutabilidad
- ✅ Lógica de dominio encapsulada

#### Implementación Propuesta

```typescript
// minutas/dto/update-minuta-provisoria.dto.ts
import { IsNotEmpty, IsString, IsObject, IsOptional, IsEnum } from 'class-validator';

export enum EstadoMinuta {
  BORRADOR = 'BORRADOR',
  EN_REVISION = 'EN_REVISION',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
}

export class UpdateMinutaProvisoriaDto {
  @IsString()
  @IsOptional()
  proyecto?: string;

  @IsEnum(EstadoMinuta)
  @IsOptional()
  estado?: EstadoMinuta;

  @IsObject()
  @IsOptional()
  datos?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  comentarios?: string;
}

// Controller con tipado correcto
@Patch('provisoria/:id')
updateProvisoria(
  @Param('id') id: string, 
  @Body() updateDto: UpdateMinutaProvisoriaDto
) {
  return this.minutasService.updateProvisoria(id, updateDto);
}

// Service con tipado correcto
async updateProvisoria(id: string, dto: UpdateMinutaProvisoriaDto) {
  return this.prisma.minutas_provisorias.update({
    where: { id },
    data: {
      ...dto,
      updated_at: new Date(),
    },
  });
}
```

---

### 4. Query Object Pattern - Filtros Complejos

#### Problema Actual
La lógica de construcción de queries está mezclada en el servicio:

```typescript
// minutas.service.ts - líneas 41-59
async findAll(query: any) { // 🔴 Type: any
  const where: any = {}; // 🔴 Type: any
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy || 'fecha_creacion';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  if (query.usuario_id) where.usuario_id = query.usuario_id;
  if (query.proyecto) where.proyecto = query.proyecto;
  if (query.estado) where.estado = query.estado;

  if (query.fechaDesde || query.fechaHasta) {
    where.fecha_creacion = {};
    if (query.fechaDesde) where.fecha_creacion.gte = new Date(query.fechaDesde);
    if (query.fechaHasta) where.fecha_creacion.lte = new Date(query.fechaHasta);
  }
  // ...
}
```

#### Beneficios del Query Object Pattern
- ✅ Reutilización de queries
- ✅ Validación centralizada de parámetros
- ✅ Type safety
- ✅ Fácil testeo

#### Implementación Propuesta

```typescript
// minutas/dto/minuta-query.dto.ts
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class MinutaQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'fecha_creacion';

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsUUID()
  usuario_id?: string;

  @IsOptional()
  @IsString()
  proyecto?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  toWhereClause() {
    const where: any = {};

    if (this.usuario_id) where.usuario_id = this.usuario_id;
    if (this.proyecto) where.proyecto = this.proyecto;
    if (this.estado) where.estado = this.estado;

    if (this.fechaDesde || this.fechaHasta) {
      where.fecha_creacion = {};
      if (this.fechaDesde) where.fecha_creacion.gte = new Date(this.fechaDesde);
      if (this.fechaHasta) where.fecha_creacion.lte = new Date(this.fechaHasta);
    }

    return where;
  }

  toOrderBy() {
    return { [this.sortBy]: this.sortOrder };
  }
}

// Controller
@Get()
findAll(@Query() query: MinutaQueryDto) {
  return this.minutasService.findAll(query);
}

// Service
async findAll(query: MinutaQueryDto) {
  const where = query.toWhereClause();
  const orderBy = query.toOrderBy();

  const [total, data] = await this.prisma.$transaction([
    this.prisma.minutas_definitivas.count({ where }),
    this.prisma.minutas_definitivas.findMany({
      where,
      orderBy,
      take: query.limit,
      skip: query.skip,
    }),
  ]);

  return {
    data,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}
```

---

### 5. Factory Pattern para Entidades Complejas

#### Problema Actual
Los servicios están creando manualmente métodos de fallback complejos:

```typescript
// proyectos.service.ts - líneas 14-48
async findAll() {
  // 1. Try to get active projects from 'proyectos' table
  const proyectos = await this.prisma.proyectos.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
  });

  if (proyectos.length > 0) {
    return proyectos;
  }

  // 2. Fallback: Get unique projects from 'tablas'
  const uniqueProjects = await this.prisma.tablas.findMany({
    distinct: ['proyecto'],
    select: { proyecto: true },
    where: { proyecto: { not: null } },
    orderBy: { proyecto: 'asc' },
  });

  // Map to Proyecto structure
  return uniqueProjects.map((p) => ({
    id: p.proyecto,
    nombre: p.proyecto,
    tabla_nombre: 'tablas',
    activo: true,
    created_at: new Date(),
    updated_at: new Date(),
  }));
}
```

#### Beneficios del Factory Pattern
- ✅ Lógica de creación centralizada
- ✅ Fácil testeo
- ✅ Cumple Single Responsibility Principle

#### Implementación Propuesta

```typescript
// proyectos/factories/proyecto.factory.ts
export interface ProyectoSource {
  id?: string;
  nombre: string;
  tabla_nombre?: string;
  descripcion?: string;
  direccion?: string;
  activo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

@Injectable()
export class ProyectoFactory {
  createFromDatabase(data: proyectos): ProyectoDto {
    return {
      id: data.id,
      nombre: data.nombre,
      tabla_nombre: data.tabla_nombre,
      descripcion: data.descripcion || undefined,
      direccion: data.direccion || undefined,
      activo: data.activo ?? true,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  createFromFallback(tablaNombre: string): ProyectoDto {
    const now = new Date();
    return {
      id: tablaNombre,
      nombre: tablaNombre,
      tabla_nombre: 'tablas',
      activo: true,
      created_at: now,
      updated_at: now,
    };
  }

  createMany(sources: ProyectoSource[]): ProyectoDto[] {
    return sources.map(source => 
      source.id 
        ? this.createFromDatabase(source as proyectos)
        : this.createFromFallback(source.nombre)
    );
  }
}

// Service actualizado
@Injectable()
export class ProyectosService {
  constructor(
    private prisma: PrismaService,
    private proyectoFactory: ProyectoFactory
  ) {}

  async findAll(): Promise<ProyectoDto[]> {
    const proyectos = await this.prisma.proyectos.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });

    if (proyectos.length > 0) {
      return this.proyectoFactory.createMany(proyectos);
    }

    const uniqueProjects = await this.prisma.tablas.findMany({
      distinct: ['proyecto'],
      select: { proyecto: true },
      where: { proyecto: { not: null } },
      orderBy: { proyecto: 'asc' },
    });

    return this.proyectoFactory.createMany(
      uniqueProjects.map(p => ({ nombre: p.proyecto }))
    );
  }
}
```

---

### 6. Strategy Pattern para Generación de Documentos

#### Problema Actual
El servicio de minutas llama directamente a un webhook de N8N, limitando la flexibilidad:

```typescript
// minutas.service.ts - líneas 104-124
async generate(data: any): Promise<{ buffer: Buffer; contentType: string }> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('N8N_WEBHOOK_URL not configured');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  // ...
}
```

#### Beneficios del Strategy Pattern
- ✅ Permite múltiples proveedores de generación (N8N, Docusign, Google Docs, etc.)
- ✅ Fácil cambio de estrategia en runtime
- ✅ Testeable con mocks

#### Implementación Propuesta

```typescript
// minutas/services/document-generation/document-generator.interface.ts
export interface IDocumentGenerator {
  generate(data: MinutaData): Promise<GeneratedDocument>;
  getSupportedFormats(): string[];
}

export interface GeneratedDocument {
  buffer: Buffer;
  contentType: string;
  filename?: string;
}

// minutas/services/document-generation/n8n-generator.service.ts
@Injectable()
export class N8nDocumentGenerator implements IDocumentGenerator {
  constructor(private configService: ConfigService) {}

  async generate(data: MinutaData): Promise<GeneratedDocument> {
    const webhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL');
    
    if (!webhookUrl) {
      throw new ConfigurationError('N8N_WEBHOOK_URL not configured');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        `N8N service error: ${response.status}`
      );
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const buffer = Buffer.from(await response.arrayBuffer());

    return { buffer, contentType };
  }

  getSupportedFormats(): string[] {
    return ['pdf', 'docx'];
  }
}

// minutas/services/document-generation/document-generation.service.ts
@Injectable()
export class DocumentGenerationService {
  private generators: Map<string, IDocumentGenerator> = new Map();

  constructor(
    private n8nGenerator: N8nDocumentGenerator,
    // Futuros generadores se agregan aquí
  ) {
    this.registerGenerator('n8n', n8nGenerator);
  }

  private registerGenerator(name: string, generator: IDocumentGenerator) {
    this.generators.set(name, generator);
  }

  async generate(
    data: MinutaData, 
    provider: string = 'n8n'
  ): Promise<GeneratedDocument> {
    const generator = this.generators.get(provider);
    
    if (!generator) {
      throw new Error(`Document generator '${provider}' not found`);
    }

    return generator.generate(data);
  }
}

// Uso en MinutasService
async generate(data: any): Promise<{ buffer: Buffer; contentType: string }> {
  return this.documentGenerationService.generate(data);
}
```

---

### 7. Interceptor Pattern para Logging y Auditoría

#### Problema Actual
No hay logging estructurado de operaciones críticas ni auditoría de cambios.

#### Beneficios
- ✅ Trazabilidad completa de operaciones
- ✅ Debugging más fácil
- ✅ Cumplimiento de auditoría
- ✅ No invasivo (cross-cutting concern)

#### Implementación Propuesta

```typescript
// common/interceptors/audit-log.interceptor.ts
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;

    const shouldAudit = this.reflector.get<boolean>(
      'audit',
      context.getHandler()
    );

    if (!shouldAudit) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        const duration = Date.now() - startTime;

        await this.prisma.auth_logs.create({
          data: {
            user_id: user?.id,
            email: user?.email,
            event_type: `${method} ${url}`,
            timestamp: new Date(),
            details: {
              body: this.sanitizeBody(body),
              response: this.sanitizeResponse(response),
              duration,
            },
            user_agent: request.headers['user-agent'],
          },
        });
      }),
      catchError(async (error) => {
        await this.prisma.auth_logs.create({
          data: {
            user_id: user?.id,
            email: user?.email,
            event_type: `${method} ${url} - ERROR`,
            timestamp: new Date(),
            details: {
              error: error.message,
              stack: error.stack,
            },
            user_agent: request.headers['user-agent'],
          },
        });
        
        throw error;
      })
    );
  }

  private sanitizeBody(body: any) {
    // Remove sensitive data
    const { password, token, ...safe } = body || {};
    return safe;
  }

  private sanitizeResponse(response: any) {
    // Limit size for logging
    return response;
  }
}

// Decorator para marcar endpoints auditables
export const Audit = () => SetMetadata('audit', true);

// Uso en controller
@Post()
@Audit()
create(@Body() createMinutaDto: CreateMinutaDto) {
  return this.minutasService.create(createMinutaDto);
}
```

---

### 8. Service Layer Pattern - Separación de Responsabilidades

#### Problema Actual
Los métodos stub en los servicios indican falta de implementación:

```typescript
// proyectos.service.ts
create(createProyectoDto: CreateProyectoDto) {
  return 'This action adds a new proyecto'; // 🔴 No implementado
}

findOne(id: number) {
  return `This action returns a #${id} proyecto`; // 🔴 No implementado
}

update(id: number, updateProyectoDto: UpdateProyectoDto) {
  return `This action updates a #${id} proyecto`; // 🔴 No implementado
}

remove(id: number) {
  return `This action removes a #${id} proyecto`; // 🔴 No implementado
}
```

#### Beneficios
- ✅ API completa y funcional
- ✅ Consistencia en operaciones CRUD
- ✅ Validación de reglas de negocio

#### Implementación Propuesta

```typescript
// proyectos/proyectos.service.ts
@Injectable()
export class ProyectosService {
  constructor(
    private prisma: PrismaService,
    private proyectoFactory: ProyectoFactory
  ) {}

  async create(dto: CreateProyectoDto): Promise<ProyectoDto> {
    // Validar que no exista un proyecto con el mismo nombre
    const exists = await this.prisma.proyectos.findUnique({
      where: { nombre: dto.nombre },
    });

    if (exists) {
      throw new ConflictException(
        `Proyecto con nombre '${dto.nombre}' ya existe`
      );
    }

    const proyecto = await this.prisma.proyectos.create({
      data: {
        nombre: dto.nombre,
        tabla_nombre: dto.tabla_nombre,
        descripcion: dto.descripcion,
        direccion: dto.direccion,
        localidad: dto.localidad,
        provincia: dto.provincia,
        activo: true,
      },
    });

    return this.proyectoFactory.createFromDatabase(proyecto);
  }

  async findOne(id: string): Promise<ProyectoDto> {
    const proyecto = await this.prisma.proyectos.findUnique({
      where: { id },
    });

    if (!proyecto) {
      throw new NotFoundException(`Proyecto con id '${id}' no encontrado`);
    }

    return this.proyectoFactory.createFromDatabase(proyecto);
  }

  async update(id: string, dto: UpdateProyectoDto): Promise<ProyectoDto> {
    // Verificar que existe
    await this.findOne(id);

    const proyecto = await this.prisma.proyectos.update({
      where: { id },
      data: {
        ...dto,
        updated_at: new Date(),
      },
    });

    return this.proyectoFactory.createFromDatabase(proyecto);
  }

  async remove(id: string): Promise<void> {
    // Soft delete - marcar como inactivo
    await this.prisma.proyectos.update({
      where: { id },
      data: {
        activo: false,
        updated_at: new Date(),
      },
    });
  }
}
```

---

## Priorización de Implementación

### 🔴 Alta Prioridad (Impacto Inmediato)

1. **Value Objects para DTOs** - Eliminar `any` types
   - *Esfuerzo*: Bajo
   - *Impacto*: Alto
   - *Archivos afectados*: 6-8 archivos

2. **Result Pattern** - Manejo de errores robusto
   - *Esfuerzo*: Medio
   - *Impacto*: Alto
   - *Archivos afectados*: Todos los servicios

3. **Query Object Pattern** - Validación de queries
   - *Esfuerzo*: Bajo
   - *Impacto*: Medio
   - *Archivos afectados*: Controllers y servicios

### 🟡 Media Prioridad (Mejora Arquitectónica)

4. **Repository Pattern** - Abstracción de datos
   - *Esfuerzo*: Alto
   - *Impacto*: Medio-Alto
   - *Archivos afectados*: Todos los servicios

5. **Factory Pattern** - Creación de entidades
   - *Esfuerzo*: Bajo
   - *Impacto*: Medio
   - *Archivos afectados*: ProyectosService principalmente

6. **Service Layer completar** - Implementar métodos stub
   - *Esfuerzo*: Medio
   - *Impacto*: Alto
   - *Archivos afectados*: ProyectosService, UnidadesService

### 🟢 Baja Prioridad (Optimización Futura)

7. **Strategy Pattern** - Generación de documentos
   - *Esfuerzo*: Medio
   - *Impacto*: Bajo (solo 1 proveedor actualmente)
   - *Archivos afectados*: MinutasService

8. **Audit Interceptor** - Logging estructurado
   - *Esfuerzo*: Bajo
   - *Impacto*: Bajo-Medio
   - *Archivos afectados*: Cross-cutting

---

## Plan de Implementación Sugerido

### Fase 1: Fundamentos (Sprint 1-2)
- [ ] Crear estructura de carpetas común (`common/`, `shared/`)
- [ ] Implementar DTOs tipados (eliminar `any`)
- [ ] Implementar Query Object Pattern
- [ ] Agregar validación con `class-validator` en todos los endpoints

### Fase 2: Robustez (Sprint 3-4)
- [ ] Implementar Result Pattern
- [ ] Crear jerarquía de errores custom
- [ ] Implementar manejo de errores global
- [ ] Agregar tests unitarios para servicios críticos

### Fase 3: Arquitectura (Sprint 5-6)
- [ ] Implementar Repository Pattern para Minutas
- [ ] Implementar Repository Pattern para Proyectos/Unidades
- [ ] Implementar Factory Pattern
- [ ] Completar métodos stub en servicios

### Fase 4: Optimización (Sprint 7+)
- [ ] Implementar Strategy Pattern para generación
- [ ] Implementar Audit Interceptor
- [ ] Agregar caching donde corresponda
- [ ] Performance testing

---

## Verificación

### Tests Automatizados
Cada patrón debe incluir:
- Tests unitarios de servicios con mocks
- Tests de integración con base de datos de prueba
- Tests E2E de endpoints críticos

### Comandos de Verificación
```bash
# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:cov

# Linting
npm run lint

# Type checking
npx tsc --noEmit
```

### Métricas de Éxito
- ✅ 0 usos de `any` type
- ✅ Cobertura de tests > 80%
- ✅ 0 errores de TypeScript
- ✅ 0 métodos stub ("This action returns...")
- ✅ Todos los endpoints con validación de DTOs
- ✅ Manejo de errores consistente en toda la API

---

## Recursos Adicionales

### Documentación de Referencia
- [NestJS Best Practices](https://docs.nestjs.com/techniques/validation)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Clean Architecture in TypeScript](https://github.com/stemmlerjs/ddd-forum)

### Ejemplos de Código
Los ejemplos de implementación en este documento pueden ser usados como plantillas para aplicar los patrones.

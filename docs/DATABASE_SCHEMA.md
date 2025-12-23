# Documentación del Esquema de Base de Datos - AppMinuta

**Base de Datos**: PostgreSQL  
**Schemas**: `auth` (Supabase), `public` (AppMinuta)  
**Fecha**: 2025-12-14

---

## Esquema Completo de Tablas

### Schema: `public` (AppMinuta Business Logic)

#### 1. **auth_logs** - Registro de Eventos de Autenticación
```sql
CREATE TABLE public.auth_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    email VARCHAR,
    event_type VARCHAR NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB,
    user_agent VARCHAR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_auth_logs_user_id ON public.auth_logs(user_id);
CREATE INDEX idx_auth_logs_event_type ON public.auth_logs(event_type);
CREATE INDEX idx_auth_logs_timestamp ON public.auth_logs(timestamp);
```

---

#### 2. **profiles** - Perfiles de Usuario
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR NOT NULL,
    nombre VARCHAR,
    apellido VARCHAR,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    require_password_change BOOLEAN DEFAULT TRUE,
    first_login BOOLEAN DEFAULT TRUE
);

-- Índices
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_activo ON public.profiles(activo);
```

---

#### 3. **roles** - Roles del Sistema
```sql
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_roles_nombre ON public.roles(nombre);
```

---

#### 4. **permisos** - Permisos del Sistema
```sql
CREATE TABLE public.permisos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    nombre VARCHAR,
    descripcion VARCHAR
);

-- Índices
CREATE INDEX idx_permisos_nombre ON public.permisos(nombre);
```

---

#### 5. **roles-permisos** - Relación Roles-Permisos (Many-to-Many)
```sql
CREATE TABLE public."roles-permisos" (
    idrol UUID DEFAULT gen_random_uuid(),
    idpermiso UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (idrol, idpermiso),
    FOREIGN KEY (idrol) REFERENCES public.roles(id),
    FOREIGN KEY (idpermiso) REFERENCES public.permisos(id)
);

-- Índices
CREATE INDEX idx_roles_permisos_idrol ON public."roles-permisos"(idrol);
CREATE INDEX idx_roles_permisos_idpermiso ON public."roles-permisos"(idpermiso);
```

---

#### 6. **usuarios-roles** - Asignación de Roles a Usuarios
```sql
CREATE TABLE public."usuarios-roles" (
    idusuario UUID DEFAULT gen_random_uuid(),
    idrol UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (idusuario, idrol),
    FOREIGN KEY (idusuario) REFERENCES public.profiles(id),
    FOREIGN KEY (idrol) REFERENCES public.roles(id)
);

-- Índices
CREATE INDEX idx_usuarios_roles_idusuario ON public."usuarios-roles"(idusuario);
CREATE INDEX idx_usuarios_roles_idrol ON public."usuarios-roles"(idrol);
```

---

#### 7. **naturalezas** - Naturalezas de Proyectos
```sql
CREATE TABLE public.naturalezas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 8. **proyectos** - Proyectos Inmobiliarios
```sql
CREATE TABLE public.proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR UNIQUE NOT NULL,
    tabla_nombre VARCHAR NOT NULL,
    descripcion VARCHAR,
    direccion VARCHAR,
    localidad VARCHAR,
    provincia VARCHAR,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    naturaleza UUID REFERENCES public.naturalezas(id)
);

-- Índices
CREATE INDEX idx_proyectos_activo ON public.proyectos(activo);
```

---

#### 9. **usuarios-proyectos** - Asignación de Usuarios a Proyectos con Roles
```sql
CREATE TABLE public."usuarios-proyectos" (
    idusuario UUID DEFAULT gen_random_uuid(),
    idproyecto UUID DEFAULT gen_random_uuid(),
    idrol UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (idusuario, idproyecto, idrol),
    FOREIGN KEY (idusuario) REFERENCES public.profiles(id),
    FOREIGN KEY (idproyecto) REFERENCES public.proyectos(id),
    FOREIGN KEY (idrol) REFERENCES public.roles(id)
);

-- Índices
CREATE INDEX idx_usuarios_proyectos_idusuario ON public."usuarios-proyectos"(idusuario);
CREATE INDEX idx_usuarios_proyectos_idproyecto ON public."usuarios-proyectos"(idproyecto);
CREATE INDEX idx_usuarios_proyectos_idrol ON public."usuarios-proyectos"(idrol);
CREATE INDEX idx_usuarios_proyectos_usuario_proyecto ON public."usuarios-proyectos"(idusuario, idproyecto);
```

---

#### 10. **minutas_definitivas** - Minutas Generadas
```sql
CREATE TABLE public.minutas_definitivas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    datos JSONB NOT NULL,
    datos_adicionales JSONB,
    estado VARCHAR NOT NULL,
    url_documento VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    comentarios VARCHAR,
    datos_mapa_ventas JSONB,
    proyecto UUID REFERENCES public.proyectos(id)
);

-- Índices (⚡ OPTIMIZACIÓN)
CREATE INDEX idx_minutas_definitivas_usuario_id ON public.minutas_definitivas(usuario_id);
CREATE INDEX idx_minutas_definitivas_estado ON public.minutas_definitivas(estado);
CREATE INDEX idx_minutas_definitivas_fecha_creacion ON public.minutas_definitivas(fecha_creacion DESC);
CREATE INDEX idx_minutas_definitivas_created_at ON public.minutas_definitivas(created_at DESC);
CREATE INDEX idx_minutas_definitivas_usuario_estado ON public.minutas_definitivas(usuario_id, estado);
```

---

#### 11. **tiposunidad** - Tipos de Unidades
```sql
CREATE TABLE public.tiposunidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL
);
```

---

#### 12. **proyectostiposunidad** - Tipos de Unidades por Proyecto
```sql
CREATE TABLE public.proyectostiposunidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
    tipounidad_id UUID NOT NULL REFERENCES public.tiposunidad(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(proyecto_id, tipounidad_id)
);
```

---

#### 13. **etapas** - Etapas de Proyectos
```sql
CREATE TABLE public.etapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL
);
```

---

#### 14. **edificios** - Edificios/Torres de Proyectos
```sql
CREATE TABLE public.edificios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES public.proyectos(id),
    nombreedificio VARCHAR(50) NOT NULL
);
```

---

#### 15. **unidades** - Unidades Inmobiliarias
```sql
CREATE TABLE public.unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edificio_id UUID REFERENCES public.edificios(id),
    tipounidad_id UUID NOT NULL REFERENCES public.tiposunidad(id),
    etapa_id UUID REFERENCES public.etapas(id),
    sectorid VARCHAR(50) UNIQUE NOT NULL,
    piso VARCHAR(50),
    nrounidad VARCHAR(50),
    dormitorios INTEGER,
    manzana VARCHAR(50),
    destino VARCHAR(100),
    frente VARCHAR
);
```

---

#### 16. **unidadesmetricas** - Métricas de Unidades
```sql
CREATE TABLE public.unidadesmetricas (
    unidad_id UUID PRIMARY KEY REFERENCES public.unidades(id),
    m2exclusivos DECIMAL(10,2),
    m2patioterraza DECIMAL(10,2),
    tipopatio_id UUID REFERENCES public.tipospatioterraza(id),
    m2comunes DECIMAL(10,2),
    m2calculo DECIMAL(10,2),
    m2totales DECIMAL(10,2),
    m2cubiertos DECIMAL(10,2),
    m2semicubiertos DECIMAL(10,2)
);
```

---

#### 17. **comerciales** - Comerciales/Vendedores
```sql
CREATE TABLE public.comerciales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) UNIQUE NOT NULL
);
```

---

#### 18. **estadocomercial** - Estados Comerciales
```sql
CREATE TABLE public.estadocomercial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombreestado VARCHAR(100) UNIQUE NOT NULL
);
```

---

#### 19. **motivosnodisp** - Motivos de No Disponibilidad
```sql
CREATE TABLE public.motivosnodisp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) UNIQUE NOT NULL
);
```

---

#### 20. **tiposcochera** - Tipos de Cochera
```sql
CREATE TABLE public.tiposcochera (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL
);
```

---

#### 21. **tipospatioterraza** - Tipos de Patio/Terraza
```sql
CREATE TABLE public.tipospatioterraza (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL
);
```

---

#### 22. **detallesventa** - Detalles de Venta de Unidades
```sql
CREATE TABLE public.detallesventa (
    unidad_id UUID PRIMARY KEY REFERENCES public.unidades(id),
    estado_id UUID REFERENCES public.estadocomercial(id),
    comercial_id UUID REFERENCES public.comerciales(id),
    motivonodisp_id UUID REFERENCES public.motivosnodisp(id),
    preciousd DECIMAL(12,2),
    usdm2 DECIMAL(10,2),
    clienteinteresado VARCHAR(255),
    clientetitularboleto VARCHAR(255),
    fechareserva DATE,
    fechafirmaboleto DATE,
    fechaposesion DATE,
    obs TEXT,
    tipocochera_id UUID REFERENCES public.tiposcochera(id),
    unidadcomprador_id UUID REFERENCES public.unidades(id)
);
```

---

#### 23. **tablas** - Tabla de Importación/Migración
```sql
CREATE TABLE public.tablas (
    id SMALLINT PRIMARY KEY,
    natdelproyecto VARCHAR,
    etapa VARCHAR,
    tipo VARCHAR,
    sectorid VARCHAR NOT NULL,
    edificiotorre VARCHAR,
    piso VARCHAR,
    nrounidad VARCHAR,
    dormitorios VARCHAR,
    frente VARCHAR,
    manzana VARCHAR,
    destino VARCHAR,
    tipocochera VARCHAR,
    tamano VARCHAR,
    m2cubiertos FLOAT,
    m2semicubiertos FLOAT,
    m2exclusivos FLOAT,
    m2patioterraza FLOAT,
    patioterraza VARCHAR,
    m2comunes FLOAT,
    m2calculo FLOAT,
    m2totales FLOAT,
    preciousd FLOAT,
    usdm2 FLOAT,
    estado VARCHAR,
    motivonodisp VARCHAR,
    obs TEXT,
    fechareserva VARCHAR,
    comercial VARCHAR,
    clienteinteresado VARCHAR,
    fechafirmaboleto VARCHAR,
    clientetitularboleto VARCHAR,
    fechaposesionporboletocompraventa VARCHAR,
    deptocomprador VARCHAR,
    proyecto_id UUID REFERENCES public.proyectos(id)
);

-- Índices (⚡ OPTIMIZACIÓN)
CREATE INDEX idx_tablas_proyecto_id ON public.tablas(proyecto_id);
CREATE INDEX idx_tablas_natdelproyecto ON public.tablas(natdelproyecto);
CREATE INDEX idx_tablas_estado ON public.tablas(estado);
CREATE INDEX idx_tablas_nrounidad ON public.tablas(nrounidad);
CREATE INDEX idx_tablas_sectorid ON public.tablas(sectorid);
CREATE INDEX idx_tablas_natdelproyecto_estado ON public.tablas(natdelproyecto, estado);
CREATE INDEX idx_tablas_natdelproyecto_nrounidad ON public.tablas(natdelproyecto, nrounidad);
```

---

## Resumen de Índices por Tabla

### Tablas con Índices de Optimización

| Tabla | Índices | Propósito |
|-------|---------|-----------|
| **minutas_definitivas** | 5 índices | Búsquedas por usuario, estado, fecha |
| **tablas** | 7 índices | Búsquedas por proyecto, estado, unidad |
| **auth_logs** | 3 índices | Auditoría por usuario, tipo, fecha |
| **usuarios-proyectos** | 4 índices | Búsquedas de asignaciones |
| **profiles** | 2 índices | Búsquedas por email, estado activo |
| **roles-permisos** | 2 índices | Búsquedas de permisos por rol |
| **usuarios-roles** | 2 índices | Búsquedas de roles por usuario |

---

## Relaciones Clave

### Sistema RBAC (Role-Based Access Control)
```
users (auth) → profiles → usuarios-roles → roles → roles-permisos → permisos
                    ↓
              usuarios-proyectos → proyectos
```

### Sistema de Minutas
```
users (auth) → minutas_definitivas → proyectos
```

### Sistema de Unidades
```
proyectos → edificios → unidades → unidadesmetricas
                    ↓
              detallesventa → comerciales, estadocomercial
```

---

## Características de Seguridad

### Row Level Security (RLS)
Las siguientes tablas tienen RLS habilitado:
- `auth_logs`
- `profiles`
- `roles`
- `permisos`
- `roles-permisos`
- `usuarios-roles`
- `usuarios-proyectos`
- `naturalezas`
- `proyectos`
- `minutas_definitivas`
- `tablas`

### Políticas de Eliminación
- **CASCADE**: `proyectostiposunidad`, `oauth_*`, `sessions`, `identities`
- **NO ACTION**: Mayoría de las relaciones (preserva integridad)

---

## Tipos de Datos Especiales

### JSONB
- `minutas_definitivas.datos` - Datos de la minuta
- `minutas_definitivas.datos_adicionales` - Datos extra
- `minutas_definitivas.datos_mapa_ventas` - Datos del mapa de ventas
- `auth_logs.details` - Detalles del evento

### UUID
- Todas las PKs principales usan UUID v4
- Generación: `gen_random_uuid()` o `uuid_generate_v4()`

### TIMESTAMPTZ
- Todas las fechas usan `TIMESTAMPTZ` (timezone-aware)
- Default: `NOW()`

---

## Estadísticas

- **Total de Tablas**: 23 (public) + 17 (auth) = 40 tablas
- **Total de Índices**: ~50 índices
- **Schemas**: 2 (auth, public)
- **Relaciones FK**: ~35 foreign keys

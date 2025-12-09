# Propuesta de Mejora de Estructura de Datos

## Situación Actual

Actualmente, el sistema utiliza tablas separadas para cada proyecto (por ejemplo, "Arboria", "Costavia", etc.), cada una con su propia estructura. Esto presenta varios desafíos:

1. **Tablas separadas por proyecto**: Cada proyecto tiene su propia tabla con estructura potencialmente diferente.
2. **Dificultad para consultas**: Es complicado consultar datos de manera uniforme cuando están en tablas separadas.
3. **Mantenimiento complejo**: Cada vez que se agrega un nuevo proyecto, se necesita crear una nueva tabla.
4. **Integración ineficiente**: La aplicación debe conocer el nombre de cada tabla y su estructura específica.

## Propuesta de Arquitectura Mejorada

Se propone migrar a una arquitectura más normalizada y flexible con las siguientes tablas principales:

### 1. Tabla centralizada de unidades

```sql
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id),
  codigo VARCHAR(50) NOT NULL,
  sector VARCHAR(50),
  tipo VARCHAR(50),
  piso VARCHAR(20),
  numero VARCHAR(20),
  dormitorios INTEGER,
  metros_totales DECIMAL(10,2),
  metros_terraza DECIMAL(10,2),
  metros_exclusivos DECIMAL(10,2),
  metros_comunes DECIMAL(10,2),
  precio_usd DECIMAL(15,2),
  estado VARCHAR(50) DEFAULT 'disponible',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 2. Tabla de atributos flexibles para datos específicos

```sql
CREATE TABLE public.unidad_atributos (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  unidad_id UUID NOT NULL REFERENCES unidades(id),
  nombre VARCHAR(100) NOT NULL,
  valor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 3. Índices para optimizar consultas

```sql
CREATE INDEX idx_unidades_proyecto_id ON public.unidades(proyecto_id);
CREATE INDEX idx_unidades_sector ON public.unidades(sector);
CREATE INDEX idx_unidades_estado ON public.unidades(estado);
CREATE INDEX idx_unidad_atributos_unidad_id ON public.unidad_atributos(unidad_id);
CREATE INDEX idx_unidad_atributos_nombre ON public.unidad_atributos(nombre);
```

## Ventajas de la Nueva Arquitectura

1. **Consultas unificadas**: Se pueden consultar todas las unidades con una sola query.
2. **Flexibilidad**: La tabla de atributos permite almacenar cualquier dato específico de cada proyecto.
3. **Escalabilidad**: Agregar un nuevo proyecto no requiere cambios en la estructura de la base de datos.
4. **Mantenimiento simplificado**: Una sola estructura para todos los proyectos.
5. **Mejor integración**: La aplicación puede usar una API uniforme para todos los proyectos.

## Proceso de Migración

### Fase 1: Preparación

1. Crear las nuevas tablas en la base de datos.
2. Desarrollar y probar los nuevos servicios que utilizarán la nueva estructura.
3. Implementar un mecanismo de sincronización temporal entre ambas estructuras.

### Fase 2: Migración de Datos

1. Desarrollar un script que lea los datos de las tablas actuales y los inserte en la nueva estructura:

```typescript
async function migrarDatos() {
  // Para cada proyecto
  const proyectos = await supabase.from('proyectos').select('*');
  
  for (const proyecto of proyectos.data) {
    // Obtener el nombre de la tabla del proyecto
    const tablaProyecto = proyecto.tabla_nombre;
    
    // Obtener todas las unidades del proyecto
    const unidades = await supabase.from(tablaProyecto).select('*');
    
    // Para cada unidad, insertar en la nueva estructura
    for (const unidad of unidades.data) {
      // Insertar datos principales en la tabla unidades
      const { data: nuevaUnidad, error } = await supabase
        .from('unidades')
        .insert({
          proyecto_id: proyecto.id,
          codigo: unidad.ID.toString(),
          sector: unidad.Sector,
          tipo: unidad.Tipo,
          piso: unidad.Piso,
          numero: unidad['N° Unidad']?.toString(),
          dormitorios: unidad.Dormitorios,
          metros_totales: unidad['M2 Totales'],
          metros_terraza: unidad['M2 Terraza'],
          precio_usd: unidad['Precio USD'],
          estado: unidad.ESTADO || 'disponible'
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`Error al migrar unidad ${unidad.ID} del proyecto ${proyecto.nombre}:`, error);
        continue;
      }
      
      // Insertar atributos adicionales
      const atributos = [];
      for (const [key, value] of Object.entries(unidad)) {
        // Excluir campos que ya están en la tabla principal
        if (!['ID', 'Sector', 'Tipo', 'Piso', 'N° Unidad', 'Dormitorios', 'M2 Totales', 'M2 Terraza', 'Precio USD', 'ESTADO'].includes(key) && value !== null) {
          atributos.push({
            unidad_id: nuevaUnidad.id,
            nombre: key,
            valor: value.toString()
          });
        }
      }
      
      if (atributos.length > 0) {
        const { error: atributosError } = await supabase
          .from('unidad_atributos')
          .insert(atributos);
        
        if (atributosError) {
          console.error(`Error al migrar atributos para la unidad ${unidad.ID} del proyecto ${proyecto.nombre}:`, atributosError);
        }
      }
    }
  }
}
```

### Fase 3: Transición

1. Actualizar todos los servicios de la aplicación para usar la nueva estructura.
2. Ejecutar pruebas exhaustivas para verificar que todo funcione correctamente.
3. Realizar la transición gradual, proyecto por proyecto.
4. Mantener temporalmente las tablas antiguas como respaldo.

### Fase 4: Finalización

1. Una vez verificado que todo funciona correctamente, eliminar las tablas antiguas.
2. Actualizar la documentación.
3. Realizar una limpieza final del código.

## Ejemplos de Consultas con la Nueva Estructura

### Obtener sectores de un proyecto

```typescript
async function getSectoresProyecto(proyectoId: string) {
  const { data, error } = await supabase
    .from('unidades')
    .select('sector')
    .eq('proyecto_id', proyectoId)
    .not('sector', 'is', null);
  
  if (error) throw error;
  
  // Extraer sectores únicos
  const sectoresUnicos = Array.from(new Set(
    data.map(item => item.sector)
  ));
  
  return sectoresUnicos;
}
```

### Obtener unidades de un sector

```typescript
async function getUnidadesPorSector(proyectoId: string, sector: string) {
  const { data, error } = await supabase
    .from('unidades')
    .select(`
      *,
      proyecto:proyectos(*),
      atributos:unidad_atributos(*)
    `)
    .eq('proyecto_id', proyectoId)
    .eq('sector', sector);
  
  if (error) throw error;
  
  return data;
}
```

### Buscar unidades por múltiples criterios

```typescript
async function buscarUnidades(criterios: {
  proyectoId?: string;
  sector?: string;
  tipo?: string;
  dormitorios?: number;
  metrosMin?: number;
  metrosMax?: number;
  precioMin?: number;
  precioMax?: number;
  estado?: string;
}) {
  let query = supabase
    .from('unidades')
    .select(`
      *,
      proyecto:proyectos(nombre),
      atributos:unidad_atributos(*)
    `);
  
  if (criterios.proyectoId) query = query.eq('proyecto_id', criterios.proyectoId);
  if (criterios.sector) query = query.eq('sector', criterios.sector);
  if (criterios.tipo) query = query.eq('tipo', criterios.tipo);
  if (criterios.dormitorios) query = query.eq('dormitorios', criterios.dormitorios);
  if (criterios.metrosMin) query = query.gte('metros_totales', criterios.metrosMin);
  if (criterios.metrosMax) query = query.lte('metros_totales', criterios.metrosMax);
  if (criterios.precioMin) query = query.gte('precio_usd', criterios.precioMin);
  if (criterios.precioMax) query = query.lte('precio_usd', criterios.precioMax);
  if (criterios.estado) query = query.eq('estado', criterios.estado);
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return data;
}
```

## Consideraciones Adicionales

- **Políticas RLS**: Asegurarse de configurar correctamente las políticas de Row Level Security para las nuevas tablas.
- **Backups**: Realizar copias de seguridad completas antes de iniciar la migración.
- **Pruebas**: Implementar pruebas exhaustivas para validar la integridad de los datos migrados.
- **Documentación**: Actualizar toda la documentación técnica para reflejar la nueva estructura.

## Conclusión

Esta migración representa una mejora significativa en la arquitectura de datos del sistema, proporcionando mayor flexibilidad, mantenibilidad y escalabilidad. Aunque requiere un esfuerzo inicial considerable, los beneficios a largo plazo justifican ampliamente la inversión.

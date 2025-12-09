# Solución Temporal para la Estructura de Datos

## Situación Actual

Actualmente, el sistema utiliza tablas separadas para cada proyecto (por ejemplo, "Arboria", "Costavia", etc.), cada una con su propia estructura. Esto dificulta la integración con la aplicación y la consulta unificada de datos.

## Solución Temporal Propuesta

Para resolver el problema inmediato sin realizar una migración completa, se propone:

1. Agregar una columna "proyecto" a cada tabla de proyecto existente
2. Crear una vista unificada que combine todas las tablas

### 1. Agregar columna proyecto a las tablas existentes

```sql
-- Para la tabla Arboria
ALTER TABLE public."Arboria" 
ADD COLUMN "proyecto" text NOT NULL DEFAULT 'Arboria';

-- Para la tabla Costavia (cuando exista)
ALTER TABLE public."Costavia" 
ADD COLUMN "proyecto" text NOT NULL DEFAULT 'Costavia';

-- Y así sucesivamente para cada proyecto
```

### 2. Crear una vista unificada

```sql
-- Crear vista unificada de unidades
CREATE OR REPLACE VIEW public.vista_unidades AS
SELECT 
  "ID"::text as id,
  "proyecto" as proyecto,
  "Sector" as sector,
  "Etapa"::text as etapa,
  "Tipo" as tipo,
  "N° Unidad"::text as numero_unidad,
  "Edificio" as edificio,
  "Piso" as piso,
  "Dormitorios"::text as dormitorios,
  "Tamaño" as tamaño,
  "M2 Totales" as metros_totales,
  "M2 Terraza" as metros_terraza,
  "M2 Exclusivos" as metros_exclusivos,
  "M2 Comunes" as metros_comunes,
  "Precio USD" as precio_usd,
  "ESTADO" as estado
FROM public."Arboria"

UNION ALL

-- Aquí agregarías las demás tablas de proyectos con la misma estructura
SELECT 
  "ID"::text as id,
  "proyecto" as proyecto,
  "Sector" as sector,
  "Etapa"::text as etapa,
  "Tipo" as tipo,
  "N° Unidad"::text as numero_unidad,
  "Edificio" as edificio,
  "Piso" as piso,
  "Dormitorios"::text as dormitorios,
  "Tamaño" as tamaño,
  "M2 Totales" as metros_totales,
  "M2 Terraza" as metros_terraza,
  "M2 Exclusivos" as metros_exclusivos,
  "M2 Comunes" as metros_comunes,
  "Precio USD" as precio_usd,
  "ESTADO" as estado
FROM public."Costavia"

-- Y así sucesivamente para cada proyecto
;
```

### 3. Modificar el servicio de unidades

```typescript
// Obtener sectores de un proyecto
export async function getSectoresProyecto(nombreProyecto: string) {
  try {
    console.log(`Iniciando consulta para obtener sectores del proyecto ${nombreProyecto}...`);
    
    const { data, error } = await supabase
      .from('vista_unidades')
      .select('sector')
      .eq('proyecto', nombreProyecto)
      .not('sector', 'is', null)
      .order('sector');
    
    if (error) {
      console.error(`Error al obtener sectores de ${nombreProyecto}:`, error);
      throw error;
    }
    
    // Extraer sectores únicos
    const sectoresUnicos = Array.from(new Set(
      data
        .map(item => item.sector)
        .filter(sector => sector !== null && sector !== undefined)
        .map(sector => String(sector))
    ));
    
    console.log(`Sectores únicos encontrados para ${nombreProyecto}:`, sectoresUnicos);
    return sectoresUnicos;
  } catch (error) {
    console.error(`Error inesperado al obtener sectores de ${nombreProyecto}:`, error);
    return [];
  }
}

// Obtener unidades por sector
export async function getUnidadesPorSector(nombreProyecto: string, sector: string) {
  try {
    const { data, error } = await supabase
      .from('vista_unidades')
      .select('*')
      .eq('proyecto', nombreProyecto)
      .eq('sector', sector);
    
    if (error) {
      console.error(`Error al obtener unidades del sector ${sector}:`, error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Error inesperado al obtener unidades del sector ${sector}:`, error);
    return [];
  }
}
```

## Ventajas de esta Solución Temporal

1. **Cambios mínimos**: Solo se necesita agregar una columna a las tablas existentes.
2. **Vista unificada**: Se pueden consultar todas las unidades a través de una sola vista.
3. **Compatibilidad**: Mantiene la estructura actual, por lo que no afecta a los procesos existentes.
4. **Implementación rápida**: Se puede implementar en poco tiempo sin interrumpir el desarrollo.

## Limitaciones

1. **No es una solución óptima a largo plazo**: Sigue manteniendo tablas separadas con posibles inconsistencias.
2. **Mantenimiento**: Cada vez que se agrega un nuevo proyecto, hay que actualizar la vista.
3. **Rendimiento**: Las consultas a través de vistas con UNION ALL pueden ser menos eficientes para grandes volúmenes de datos.

## Próximos Pasos

1. Implementar esta solución temporal para resolver el problema inmediato.
2. Planificar la migración a una estructura normalizada como se describe en el documento "mejora-estructura-datos.md" para una solución más robusta a largo plazo.

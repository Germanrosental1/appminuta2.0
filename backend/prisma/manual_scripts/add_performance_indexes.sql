-- ⚡ OPTIMIZACIÓN: Índices adicionales para mejorar performance de queries frecuentes
-- Ejecutar manualmente en Supabase SQL Editor

-- 1. Índice compuesto para búsquedas frecuentes en unidades
-- Mejora: Filtrar unidades por edificio y tipo en una sola consulta
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unidades_edificio_tipo 
ON unidades(edificio_id, tipounidad_id);

-- 2. Índice para filtros por estado en detallesventa  
-- Mejora: Listar unidades por estado comercial
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_detallesventa_estado 
ON detallesventa(estado_id);

-- 3. Índice para búsqueda de unidades por etapa
-- Mejora: Filtrar unidades cuando se selecciona una etapa en el wizard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_unidades_etapa 
ON unidades(etapa_id) WHERE etapa_id IS NOT NULL;

-- 4. Índice para el batch endpoint (IN clause con múltiples IDs)
-- Ya está cubierto por el PK pero ayuda con ordenamiento
-- (PostgreSQL optimiza bien las queries IN con PKs)

-- 5. Índice para edificios por proyecto
-- Mejora: Filtrar edificios por proyecto
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_edificios_proyecto 
ON edificios(proyecto_id);

-- 6. Índice para búsquedas case-insensitive de proyectos
-- Mejora: Búsqueda por nombre de proyecto
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proyectos_nombre_lower 
ON proyectos(LOWER(nombre));

-- ============================================
-- Verificar índices creados
-- ============================================
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('unidades', 'detallesventa', 'edificios', 'proyectos')
-- ORDER BY tablename, indexname;

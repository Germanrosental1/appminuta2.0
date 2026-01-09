-- =====================================================
-- PERFORMANCE OPTIMIZATION SCRIPT FOR MINUTAS
-- Execute these commands in Supabase SQL Editor
-- =====================================================

-- 1. ELIMINAR TRIGGER DE VALIDACIÓN DE ESTADOS
-- Este trigger agrega latencia en cada UPDATE
-- La validación ahora se hace en el backend (más rápido)
-- =====================================================
DROP TRIGGER IF EXISTS check_minuta_state_transition ON minutas_definitivas;
DROP FUNCTION IF EXISTS validate_minuta_state_transition();

-- 2. CREAR ÍNDICE COMPUESTO PARA OPTIMISTIC LOCKING
-- Optimiza la búsqueda por id + version que se usa en updateMany
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_minutas_id_version 
ON minutas_definitivas(id, version);

-- 3. CREAR ÍNDICE PARA BÚSQUEDAS FRECUENTES
-- Optimiza las queries de listado por usuario y estado
-- =====================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_minutas_usuario_proyecto_estado
ON minutas_definitivas(usuario_id, proyecto, estado);

-- 4. ANALIZAR TABLA PARA ACTUALIZAR ESTADÍSTICAS
-- Ayuda al query planner a elegir mejores planes de ejecución
-- =====================================================
ANALYZE minutas_definitivas;

-- =====================================================
-- VERIFICACIÓN: Ejecutar después de aplicar los cambios
-- =====================================================
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'minutas_definitivas';

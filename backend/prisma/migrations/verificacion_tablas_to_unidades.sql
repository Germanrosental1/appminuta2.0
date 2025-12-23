-- =====================================================
-- SCRIPT DE VERIFICACIÓN: Migración de tablas → unidades
-- =====================================================
-- Ejecutar en Supabase SQL Editor ANTES de eliminar tabla tablas
-- Este script verifica que todos los datos estén sincronizados

-- 1. CONTEO DE REGISTROS
-- =====================================================
SELECT 
  'tablas' as tabla,
  COUNT(*) as total_registros
FROM tablas
UNION ALL
SELECT 
  'unidades' as tabla,
  COUNT(*) as total_registros
FROM unidades;

-- Resultado esperado: números similares (unidades puede tener MÁS si agregaste nuevas)


-- 2. VERIFICAR REGISTROS HUÉRFANOS EN TABLAS
-- =====================================================
SELECT 
  t.id,
  t.sectorid,
  t.proyecto_id,
  'HUÉRFANO: No existe en unidades' as status
FROM tablas t
WHERE NOT EXISTS (
  SELECT 1 
  FROM unidades u 
  WHERE u.sectorid = t.sectorid
);

-- Resultado esperado: 0 registros (si hay resultados, esos datos se perderían)


-- 3. VERIFICAR INTEGRIDAD DE PROYECTOS
-- =====================================================
SELECT 
  p.nombre as proyecto,
  COUNT(DISTINCT t.sectorid) as total_en_tablas,
  COUNT(DISTINCT u.id) as total_en_unidades
FROM proyectos p
LEFT JOIN tablas t ON t.proyecto_id = p.id
LEFT JOIN edificios e ON e.proyecto_id = p.id
LEFT JOIN unidades u ON u.edificio_id = e.id
GROUP BY p.id, p.nombre
ORDER BY p.nombre;

-- Resultado esperado: total_en_tablas ≈ total_en_unidades


-- 4. VERIFICAR FOREIGN KEYS CRÍTICAS
-- =====================================================

-- 4.1. Etapas
SELECT 
  'Etapas sin FK' as issue,
  COUNT(*) as total
FROM unidades
WHERE etapa_id IS NULL;

-- 4.2. Tipos de Unidad
SELECT 
  'Tipos sin FK' as issue,
  COUNT(*) as total
FROM unidades
WHERE tipounidad_id IS NULL;

-- 4.3. Edificios
SELECT 
  'Unidades sin edificio' as issue,
  COUNT(*) as total
FROM unidades
WHERE edificio_id IS NULL;

-- Resultado esperado: idealmente 0 para todos (o mínimo)


-- 5. COMPARAR DATOS ESPECÍFICOS (SAMPLE)
-- =====================================================
SELECT 
  t.sectorid as tablas_sector,
  u.sectorid as unidades_sector,
  t.etapa as tablas_etapa,
  e.nombre as unidades_etapa,
  t.tipo as tablas_tipo,
  tu.nombre as unidades_tipo,
  CASE 
    WHEN t.sectorid = u.sectorid 
     AND (t.etapa = e.nombre OR (t.etapa IS NULL AND e.nombre IS NULL))
     AND (t.tipo = tu.nombre OR (t.tipo IS NULL AND tu.nombre IS NULL))
    THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM tablas t
LEFT JOIN unidades u ON t.sectorid = u.sectorid
LEFT JOIN etapas e ON u.etapa_id = e.id
LEFT JOIN tiposunidad tu ON u.tipounidad_id = tu.id
LIMIT 50;

-- Revisar manualmente los primeros 50 - deben ser MATCH


-- 6. VERIFICAR VALORES ÚNICOS EN NATURALEZAS
-- =====================================================
SELECT 
  'tablas.natdelproyecto' as fuente,
  COUNT(DISTINCT natdelproyecto) as total_valores
FROM tablas
WHERE natdelproyecto IS NOT NULL
UNION ALL
SELECT 
  'naturalezas.nombre' as fuente,
  COUNT(*) as total_valores
FROM naturalezas
WHERE nombre IS NOT NULL;

-- Resultado: naturalezas debe tener TODAS las naturalezas únicas de tablas


-- 7. TESTING DE QUERIES CRÍTICAS
-- =====================================================

-- 7.1. getEtapas (Arboria)
SELECT DISTINCT e.nombre
FROM unidades u
INNER JOIN edificios ed ON u.edificio_id = ed.id
INNER JOIN proyectos p ON ed.proyecto_id = p.id
LEFT JOIN etapas e ON u.etapa_id = e.id
WHERE p.nombre = 'Arboria'
  AND u.etapa_id IS NOT NULL
ORDER BY e.nombre;

-- 7.2. getTipos (Arboria, etapa "1")  
SELECT DISTINCT tu.nombre
FROM unidades u
INNER JOIN edificios ed ON u.edificio_id = ed.id
INNER JOIN proyectos p ON ed.proyecto_id = p.id
INNER JOIN tiposunidad tu ON u.tipounidad_id = tu.id
LEFT JOIN etapas e ON u.etapa_id = e.id
WHERE p.nombre = 'Arboria'
  AND (e.nombre = '1' OR e.nombre IS NULL)
ORDER BY tu.nombre;

-- 7.3. getSectores (Arboria)
SELECT DISTINCT u.sectorid
FROM unidades u
INNER JOIN edificios ed ON u.edificio_id = ed.id
INNER JOIN proyectos p ON ed.proyecto_id = p.id
WHERE p.nombre = 'Arboria'
  AND u.sectorid IS NOT NULL
  AND u.sectorid <> ''
ORDER BY u.sectorid;


-- 8. RESUMEN FINAL
-- =====================================================
WITH stats AS (
  SELECT 
    (SELECT COUNT(*) FROM tablas) as total_tablas,
    (SELECT COUNT(*) FROM unidades) as total_unidades,
    (SELECT COUNT(*) FROM tablas t 
     WHERE NOT EXISTS (
       SELECT 1 FROM unidades u WHERE u.sectorid = t.sectorid
     )) as huerfanos,
    (SELECT COUNT(*) FROM unidades WHERE etapa_id IS NULL) as sin_etapa,
    (SELECT COUNT(*) FROM unidades WHERE edificio_id IS NULL) as sin_edificio
)
SELECT 
  total_tablas,
  total_unidades,
  huerfanos,
  sin_etapa,
  sin_edificio,
  CASE 
    WHEN huerfanos = 0 
     AND sin_edificio = 0
     AND total_unidades >= total_tablas
    THEN '✅ SAFE TO DROP TABLAS'
    ELSE '⚠️ REVIEW ISSUES BEFORE DROPPING'
  END as recommendation
FROM stats;


-- 9. BACKUP ANTES DE ELIMINAR (OPCIONAL)
-- =====================================================
-- Crear tabla de respaldo antes de drop
CREATE TABLE IF NOT EXISTS tablas_backup_20251215 AS 
SELECT * FROM tablas;

-- Verificar backup
SELECT COUNT(*) FROM tablas_backup_20251215;


-- 10. ELIMINAR TABLA TABLAS (SOLO DESPUÉS DE VERIFICAR)
-- =====================================================
-- ⚠️⚠️⚠️ EJECUTAR SOLO SI EL RESUMEN DICE "SAFE TO DROP" ⚠️⚠️⚠️
-- 
-- DROP TABLE IF EXISTS tablas;
--
-- NOTA: Comentado por seguridad. Descomentar manualmente solo después
-- de verificar TODOS los checks anteriores.

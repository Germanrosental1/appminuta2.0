-- =====================================================
-- SCRIPT DE LIMPIEZA: Eliminar edificios duplicados
-- =====================================================

BEGIN;

-- PASO 1: Identificar edificios duplicados por proyecto + nombre
-- =====================================================

WITH edificios_duplicados AS (
  SELECT 
    proyecto_id,
    nombreedificio,
    COUNT(*) as total,
    ARRAY_AGG(id ORDER BY created_at ASC) as edificio_ids
  FROM edificios
  GROUP BY proyecto_id, nombreedificio
  HAVING COUNT(*) > 1
),
edificios_a_mantener AS (
  SELECT 
    proyecto_id,
    nombreedificio,
    edificio_ids[1] as edificio_id_a_mantener
  FROM edificios_duplicados
)
SELECT 
  ed.proyecto_id,
  p.nombre as proyecto,
  ed.nombreedificio,
  ed.total as total_duplicados,
  eam.edificio_id_a_mantener
FROM edificios_duplicados ed
LEFT JOIN proyectos p ON ed.proyecto_id = p.id
LEFT JOIN edificios_a_mantener eam ON ed.proyecto_id = eam.proyecto_id 
  AND ed.nombreedificio = eam.nombreedificio
ORDER BY ed.total DESC;

-- PASO 2: Actualizar unidades para que apunten al edificio más antiguo
-- =====================================================

WITH edificios_a_mantener AS (
  SELECT 
    proyecto_id,
    nombreedificio,
    (ARRAY_AGG(id ORDER BY created_at ASC))[1] as edificio_id_correcto
  FROM edificios
  GROUP BY proyecto_id, nombreedificio
  HAVING COUNT(*) > 1
)
UPDATE unidades u
SET edificio_id = eam.edificio_id_correcto
FROM edificios e
INNER JOIN edificios_a_mantener eam 
  ON e.proyecto_id = eam.proyecto_id 
  AND e.nombreedificio = eam.nombreedificio
WHERE u.edificio_id = e.id
  AND e.id <> eam.edificio_id_correcto;

-- PASO 3: Eliminar edificios duplicados (mantener solo el más antiguo)
-- =====================================================

WITH edificios_a_eliminar AS (
  SELECT UNNEST(
    (ARRAY_AGG(id ORDER BY created_at ASC))[2:]
  ) as edificio_id_a_eliminar
  FROM edificios
  GROUP BY proyecto_id, nombreedificio
  HAVING COUNT(*) > 1
)
DELETE FROM edificios
WHERE id IN (SELECT edificio_id_a_eliminar FROM edificios_a_eliminar);

-- PASO 4: Verificar resultado
-- =====================================================

SELECT 
  'Edificios después de limpieza' as status,
  COUNT(*) as total_edificios,
  COUNT(DISTINCT (proyecto_id, nombreedificio)) as combinaciones_unicas
FROM edificios;

-- Esperado: total_edificios = combinaciones_unicas

-- Si todo OK:
COMMIT;

-- Si hay problemas:
-- ROLLBACK;

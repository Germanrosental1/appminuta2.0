-- =====================================================
-- SCRIPT CORRECTIVO SIMPLIFICADO: Asignar "No Asignado"
-- =====================================================
-- Este script crea un edificio "No Asignado" por proyecto
-- y asigna todas las unidades sin edificio_id a ese edificio

BEGIN;

-- PASO 1: Crear edificio "No Asignado" para cada proyecto
-- =====================================================

INSERT INTO edificios (id, proyecto_id, nombreedificio)
SELECT DISTINCT
  gen_random_uuid(),
  t.proyecto_id,
  'No Asignado'
FROM unidades u
INNER JOIN tablas t ON u.sectorid = t.sectorid
WHERE u.edificio_id IS NULL
  AND t.proyecto_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM edificios e
    WHERE e.proyecto_id = t.proyecto_id
      AND e.nombreedificio = 'No Asignado'
  );

-- PASO 2: Asignar TODAS las unidades sin edificio a "No Asignado"
-- =====================================================

UPDATE unidades u
SET edificio_id = e.id
FROM tablas t
INNER JOIN edificios e ON e.proyecto_id = t.proyecto_id 
  AND e.nombreedificio = 'No Asignado'
WHERE u.sectorid = t.sectorid
  AND u.edificio_id IS NULL;

-- PASO 3: Verificación final
-- =====================================================

SELECT 
  'RESUMEN FINAL' as titulo,
  (SELECT COUNT(*) FROM unidades WHERE edificio_id IS NULL) as unidades_sin_edificio,
  (SELECT COUNT(*) FROM unidades WHERE edificio_id IS NOT NULL) as unidades_con_edificio,
  (SELECT COUNT(*) FROM edificios WHERE nombreedificio = 'No Asignado') as edificios_no_asignado_creados;

-- Esperado:
-- unidades_sin_edificio = 0
-- unidades_con_edificio = 820
-- edificios_no_asignado_creados = número de proyectos afectados

-- Si todo está OK:
COMMIT;

-- Si hay problemas:
-- ROLLBACK;

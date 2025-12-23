-- Diagnóstico: ¿Por qué hay unidades sin edificio_id?
-- Ejecutar esta query para entender el problema:

SELECT 
  u.id,
  u.sectorid,
  t.edificiotorre,
  t.proyecto_id,
  e.id as edificio_encontrado
FROM unidades u
INNER JOIN tablas t ON u.sectorid = t.sectorid
LEFT JOIN edificios e ON e.proyecto_id = t.proyecto_id 
  AND e.nombreedificio = COALESCE(t.edificiotorre, 'Edificio Principal')
WHERE u.edificio_id IS NULL
LIMIT 20;

-- Esto mostrará:
-- - Si el problema es que no se encontró el edificio
-- - O si hay un problema con el match del nombre

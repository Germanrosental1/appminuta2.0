-- =====================================================
-- MIGRACIÓN COMPLETA: tablas → modelo normalizado
-- =====================================================
-- Este script migra TODOS los datos de la tabla legacy `tablas`
-- al modelo normalizado (unidades, edificios, detallesventa, etc)
--
-- ⚠️ EJECUTAR EN ORDEN - NO SALTEAR PASOS
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: INSERTAR LOOKUP VALUES FALTANTES
-- =====================================================

-- 1.1. Migrar Etapas
INSERT INTO etapas (id, nombre)
SELECT 
  gen_random_uuid(),
  etapa
FROM (
  SELECT DISTINCT etapa
  FROM tablas
  WHERE etapa IS NOT NULL
    AND etapa NOT IN (SELECT nombre FROM etapas)
) as distinct_etapas
ON CONFLICT DO NOTHING;

-- 1.2. Migrar Tipos de Unidad
INSERT INTO tiposunidad (id, nombre)
SELECT 
  gen_random_uuid(),
  tipo
FROM (
  SELECT DISTINCT tipo
  FROM tablas
  WHERE tipo IS NOT NULL
    AND tipo NOT IN (SELECT nombre FROM tiposunidad)
) as distinct_tipos
ON CONFLICT DO NOTHING;

-- 1.3. Migrar Estados Comerciales
INSERT INTO estadocomercial (id, nombreestado)
SELECT 
  gen_random_uuid(),
  estado
FROM (
  SELECT DISTINCT estado
  FROM tablas
  WHERE estado IS NOT NULL
    AND estado NOT IN (SELECT nombreestado FROM estadocomercial)
) as distinct_estados
ON CONFLICT DO NOTHING;

-- 1.4. Migrar Comerciales
INSERT INTO comerciales (id, nombre, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  comercial,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT comercial
  FROM tablas
  WHERE comercial IS NOT NULL
    AND comercial NOT IN (SELECT nombre FROM comerciales)
) as distinct_comerciales
ON CONFLICT DO NOTHING;

-- 1.5. Migrar Tipos de Cochera
INSERT INTO tiposcochera (id, nombre)
SELECT 
  gen_random_uuid(),
  tipocochera
FROM (
  SELECT DISTINCT tipocochera
  FROM tablas
  WHERE tipocochera IS NOT NULL
    AND tipocochera NOT IN (SELECT nombre FROM tiposcochera)
) as distinct_tiposcochera
ON CONFLICT DO NOTHING;

-- 1.6. Migrar Motivos No Disponibilidad
INSERT INTO motivosnodisp (id, nombre)
SELECT 
  gen_random_uuid(),
  motivonodisp
FROM (
  SELECT DISTINCT motivonodisp
  FROM tablas
  WHERE motivonodisp IS NOT NULL
    AND motivonodisp NOT IN (SELECT nombre FROM motivosnodisp)
) as distinct_motivos
ON CONFLICT DO NOTHING;


-- =====================================================
-- PASO 2: CREAR EDIFICIOS FALTANTES
-- =====================================================

-- Estrategia: Si edificiotorre existe, usarlo como nombre
-- Si no, crear edificio por defecto por proyecto

INSERT INTO edificios (id, proyecto_id, nombreedificio)
SELECT DISTINCT
  gen_random_uuid(),
  t.proyecto_id,
  COALESCE(t.edificiotorre, 'Edificio Principal')
FROM tablas t
WHERE t.proyecto_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM edificios e
    WHERE e.proyecto_id = t.proyecto_id
      AND e.nombreedificio = COALESCE(t.edificiotorre, 'Edificio Principal')
  )
ON CONFLICT DO NOTHING;


-- =====================================================
-- PASO 3: MIGRAR UNIDADES FALTANTES
-- =====================================================

-- Insertar unidades que existen en tablas pero no en unidades (basado en sectorid)
INSERT INTO unidades (
  id,
  edificio_id,
  tipounidad_id,
  etapa_id,
  sectorid,
  piso,
  nrounidad,
  dormitorios,
  manzana,
  destino,
  frente
)
SELECT 
  gen_random_uuid() as id,
  
  -- Buscar edificio_id correspondiente
  (SELECT e.id 
   FROM edificios e 
   WHERE e.proyecto_id = t.proyecto_id
     AND e.nombreedificio = COALESCE(t.edificiotorre, 'Edificio Principal')
   LIMIT 1
  ) as edificio_id,
  
  -- Buscar tipounidad_id por nombre
  (SELECT tu.id FROM tiposunidad tu WHERE tu.nombre = t.tipo LIMIT 1) as tipounidad_id,
  
  -- Buscar etapa_id por nombre
  (SELECT et.id FROM etapas et WHERE et.nombre = t.etapa LIMIT 1) as etapa_id,
  
  t.sectorid,
  t.piso,
  t.nrounidad,
  
  -- dormitorios: convertir string a int
  CASE 
    WHEN t.dormitorios ~ '^[0-9]+$' THEN t.dormitorios::INT
    ELSE NULL
  END as dormitorios,
  
  t.manzana,
  t.destino,
  t.frente

FROM tablas t
WHERE t.sectorid IS NOT NULL
  AND t.sectorid NOT IN (SELECT sectorid FROM unidades)
  AND t.proyecto_id IS NOT NULL
  AND t.tipo IS NOT NULL  -- Requerido por FK
ON CONFLICT (sectorid) DO NOTHING;


-- =====================================================
-- PASO 4: MIGRAR MÉTRICAS DE UNIDADES
-- =====================================================

INSERT INTO unidadesmetricas (
  unidad_id,
  m2exclusivos,
  m2patioterraza,
  m2comunes,
  m2calculo,
  m2totales,
  m2cubiertos,
  m2semicubiertos,
  tipopatio_id
)
SELECT 
  u.id as unidad_id,
  t.m2exclusivos,
  t.m2patioterraza,
  t.m2comunes,
  t.m2calculo,
  t.m2totales,
  t.m2cubiertos,
  t.m2semicubiertos,
  
  -- Buscar tipo de patio por nombre
  (SELECT tp.id FROM tipospatioterraza tp WHERE tp.nombre = t.patioterraza LIMIT 1) as tipopatio_id

FROM tablas t
INNER JOIN unidades u ON t.sectorid = u.sectorid
WHERE NOT EXISTS (
  SELECT 1 FROM unidadesmetricas um WHERE um.unidad_id = u.id
)
ON CONFLICT (unidad_id) DO NOTHING;


-- =====================================================
-- PASO 5: MIGRAR DETALLES DE VENTA
-- =====================================================

INSERT INTO detallesventa (
  unidad_id,
  estado_id,
  comercial_id,
  motivonodisp_id,
  preciousd,
  usdm2,
  clienteinteresado,
  clientetitularboleto,
  fechareserva,
  fechafirmaboleto,
  fechaposesion,
  obs,
  tipocochera_id
)
SELECT 
  u.id as unidad_id,
  
  -- Buscar estado_id
  (SELECT ec.id FROM estadocomercial ec WHERE ec.nombreestado = t.estado LIMIT 1) as estado_id,
  
  -- Buscar comercial_id
  (SELECT c.id FROM comerciales c WHERE c.nombre = t.comercial LIMIT 1) as comercial_id,
  
  -- Buscar motivo no disponibilidad
  (SELECT mn.id FROM motivosnodisp mn WHERE mn.nombre = t.motivonodisp LIMIT 1) as motivonodisp_id,
  
  t.preciousd,
  t.usdm2,
  t.clienteinteresado,
  t.clientetitularboleto,
  
  -- Convertir fechas string → date (NULL si falla la conversión)
  CASE 
    WHEN t.fechareserva ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
      TO_DATE(t.fechareserva, 'DD/MM/YYYY')
    ELSE NULL
  END as fechareserva,
  
  CASE 
    WHEN t.fechafirmaboleto ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
      TO_DATE(t.fechafirmaboleto, 'DD/MM/YYYY')
    ELSE NULL
  END as fechafirmaboleto,
  
  CASE 
    WHEN t.fechaposesionporboletocompraventa ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
      TO_DATE(t.fechaposesionporboletocompraventa, 'DD/MM/YYYY')
    ELSE NULL
  END as fechaposesion,
  
  t.obs,
  
  -- Buscar tipo cochera
  (SELECT tc.id FROM tiposcochera tc WHERE tc.nombre = t.tipocochera LIMIT 1) as tipocochera_id

FROM tablas t
INNER JOIN unidades u ON t.sectorid = u.sectorid
WHERE NOT EXISTS (
  SELECT 1 FROM detallesventa dv WHERE dv.unidad_id = u.id
)
ON CONFLICT (unidad_id) DO NOTHING;


-- =====================================================
-- PASO 6: VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

-- 6.1. Contar registros migrados
SELECT 
  'Verificación de Migración' as titulo,
  (SELECT COUNT(*) FROM tablas) as tablas_total,
  (SELECT COUNT(*) FROM unidades) as unidades_total,
  (SELECT COUNT(*) FROM detallesventa) as detallesventa_total;

-- 6.2. Verificar que NO hay huérfanos
SELECT 
  'Huérfanos después de migración' as issue,
  COUNT(*) as total
FROM tablas t
WHERE t.sectorid IS NOT NULL
  AND t.sectorid NOT IN (SELECT sectorid FROM unidades);
-- Esperado: 0

-- 6.3. Verificar FKs NULL
SELECT 
  'Unidades sin edificio' as issue,
  COUNT(*) as total
FROM unidades
WHERE edificio_id IS NULL;

SELECT 
  'Unidades sin tipo' as issue,
  COUNT(*) as total
FROM unidades
WHERE tipounidad_id IS NULL;


-- =====================================================
-- PASO 7: SI TODO OK, HACER COMMIT
-- =====================================================

-- ⚠️ REVISAR RESULTADOS DE VERIFICACIÓN ANTES DE COMMIT

-- Si todo está bien, descomentar:
-- COMMIT;

-- Si hay problemas:
-- ROLLBACK;


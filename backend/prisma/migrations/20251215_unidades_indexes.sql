-- ============================================
-- SCRIPT: Índices para optimizar búsqueda de unidades
-- Fecha: 2025-12-15
-- Descripción: Mejora el rendimiento de consultas por proyecto/etapa/tipo
-- ============================================

-- Verificar índices existentes antes de crear
DO $$
BEGIN
    -- Índice en edificio_id (para join con proyectos)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unidades_edificio_id') THEN
        CREATE INDEX idx_unidades_edificio_id ON unidades(edificio_id);
        RAISE NOTICE 'Índice idx_unidades_edificio_id creado';
    ELSE
        RAISE NOTICE 'Índice idx_unidades_edificio_id ya existe';
    END IF;

    -- Índice en etapa_id  
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unidades_etapa_id') THEN
        CREATE INDEX idx_unidades_etapa_id ON unidades(etapa_id);
        RAISE NOTICE 'Índice idx_unidades_etapa_id creado';
    ELSE
        RAISE NOTICE 'Índice idx_unidades_etapa_id ya existe';
    END IF;

    -- Índice en tipounidad_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unidades_tipounidad_id') THEN
        CREATE INDEX idx_unidades_tipounidad_id ON unidades(tipounidad_id);
        RAISE NOTICE 'Índice idx_unidades_tipounidad_id creado';
    ELSE
        RAISE NOTICE 'Índice idx_unidades_tipounidad_id ya existe';
    END IF;

    -- Índice compuesto para consultas frecuentes (proyecto -> edificio -> etapa -> tipo)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_unidades_edificio_etapa_tipo') THEN
        CREATE INDEX idx_unidades_edificio_etapa_tipo ON unidades(edificio_id, etapa_id, tipounidad_id);
        RAISE NOTICE 'Índice compuesto idx_unidades_edificio_etapa_tipo creado';
    ELSE
        RAISE NOTICE 'Índice idx_unidades_edificio_etapa_tipo ya existe';
    END IF;

    -- Índice en edificios.proyecto_id para el JOIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_edificios_proyecto_id') THEN
        CREATE INDEX idx_edificios_proyecto_id ON edificios(proyecto_id);
        RAISE NOTICE 'Índice idx_edificios_proyecto_id creado';
    ELSE
        RAISE NOTICE 'Índice idx_edificios_proyecto_id ya existe';
    END IF;

    -- Índice en etapas.nombre para búsquedas por nombre
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_etapas_nombre') THEN
        CREATE INDEX idx_etapas_nombre ON etapas(nombre);
        RAISE NOTICE 'Índice idx_etapas_nombre creado';
    ELSE
        RAISE NOTICE 'Índice idx_etapas_nombre ya existe';
    END IF;

    -- Índice en tiposunidad.nombre para búsquedas por tipo
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tiposunidad_nombre') THEN
        CREATE INDEX idx_tiposunidad_nombre ON tiposunidad(nombre);
        RAISE NOTICE 'Índice idx_tiposunidad_nombre creado';
    ELSE
        RAISE NOTICE 'Índice idx_tiposunidad_nombre ya existe';
    END IF;
END $$;

-- Verificación: mostrar índices creados
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename IN ('unidades', 'edificios', 'etapas', 'tiposunidad')
ORDER BY tablename, indexname;
